import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAdSliceImpression } from "@/server/services/ad-serving.service";

/**
 * Fired by the client rotation component once a slice has been confirmed visible — never on
 * render alone (see ad-rotation.tsx). Billing decision is made entirely server-side: the cost
 * charged is always this row's own `effectiveCpm` from the currently-valid AdSlotAllocation row,
 * never anything the client sends. A client can only ever pick *which* row to trust (via
 * campaignId + slotKey), not *how much* it costs — closing off the obvious "script repeated
 * POSTs to drain a wallet" abuse path that moving billing off the render path would otherwise
 * open. A stale/expired/missing allocation (TTL lapsed, campaign paused/completed mid-visit) is
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
  if (!slotKey) {
    return NextResponse.json({ success: false, message: "slotKey is required" }, { status: 400 });
  }

  const allocation = await prisma.adSlotAllocation.findFirst({
    where: { campaignId, slotKey, validUntil: { gte: new Date() } },
  });
  if (!allocation) {
    return NextResponse.json({ success: true, charged: false });
  }

  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId, status: "live" },
    select: { id: true },
  });
  if (!campaign) {
    return NextResponse.json({ success: true, charged: false });
  }

  recordAdSliceImpression(campaignId, Number(allocation.effectiveCpm)).catch(() => {});

  return NextResponse.json({ success: true, charged: true });
}
