import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, trustedClientIp } from "@/lib/rate-limit";
import { recordAdSliceImpression } from "@/server/services/ad-serving.service";

/** A slice reappears once per 60s rotation lap, so one bill per viewer per slice per 50s is the legit maximum. */
const PER_VIEWER_SLICE_WINDOW_MS = 50 * 1000;
/** Upper bound on billed impressions per viewer across all campaigns (idle open tabs, scripts). */
const PER_VIEWER_HOURLY_MAX = 120;
/** Safety valve per campaign; set AD_IMPRESSION_MAX_PER_CAMPAIGN_HOUR to match real traffic. */
const PER_CAMPAIGN_HOURLY_MAX = Number(process.env.AD_IMPRESSION_MAX_PER_CAMPAIGN_HOUR) || 1000;
const HOUR_MS = 60 * 60 * 1000;

const notCharged = () => NextResponse.json({ success: true, charged: false });

/**
 * Fired by the client rotation component once a slice has been confirmed visible — never on
 * render alone (see ad-rotation.tsx). Billing decision is made entirely server-side: the cost
 * charged is always this row's own `effectiveCpm` from the currently-valid AdSlotAllocation row,
 * never anything the client sends. A client can only ever pick *which* row to trust (via
 * campaignId + slotKey), not *how much* it costs. Repeated POSTs (a script draining a wallet)
 * are bounded by the per-viewer, per-slice and per-campaign limits below, and the wallet is
 * never charged past zero (see recordAdSliceImpression). A stale/expired/missing allocation (TTL lapsed, campaign paused/completed mid-visit) is
 * a normal, harmless race — the client's rotation timer just outlived the data — so it no-ops
 * with 200, not an error.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId: raw } = await params;
  const campaignId = Number(raw);
  if (!Number.isFinite(campaignId) || campaignId <= 0) {
    return NextResponse.json({ success: false, message: "Invalid campaign id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { slotKey?: string };
  const slotKey = typeof body.slotKey === "string" ? body.slotKey : null;
  if (!slotKey || slotKey.length > 200) {
    return NextResponse.json({ success: false, message: "slotKey is required" }, { status: 400 });
  }

  // Throttles answer 200 + charged:false (not 429) — same as a stale allocation, so a
  // scripted caller learns nothing and a legit client has nothing to retry.
  // Per-viewer limits need a real per-visitor IP; without one they'd throttle all visitors
  // together, so only the per-campaign cap and the wallet floor apply.
  const ip = trustedClientIp(request);
  if (ip && !checkRateLimit(`ad-imp:ip:${ip}`, PER_VIEWER_HOURLY_MAX, HOUR_MS).allowed) {
    return notCharged();
  }

  const allocation = await prisma.adSlotAllocation.findFirst({
    where: { campaignId, slotKey, validUntil: { gte: new Date() } },
  });
  if (!allocation) return notCharged();

  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId, status: "live" },
    select: { id: true },
  });
  if (!campaign) return notCharged();

  if (
    (ip &&
      !checkRateLimit(`ad-imp:slice:${ip}:${campaignId}:${slotKey}`, 1, PER_VIEWER_SLICE_WINDOW_MS)
        .allowed) ||
    !checkRateLimit(`ad-imp:campaign:${campaignId}`, PER_CAMPAIGN_HOURLY_MAX, HOUR_MS).allowed
  ) {
    return notCharged();
  }

  const charged = await recordAdSliceImpression(campaignId, Number(allocation.effectiveCpm)).catch(
    (err) => {
      console.error("[ads/impression]", err);
      return false;
    }
  );

  return NextResponse.json({ success: true, charged });
}
