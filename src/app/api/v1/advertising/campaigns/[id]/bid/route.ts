import { NextRequest, NextResponse } from "next/server";
import { requireAdvertisingApi } from "@/lib/advertising-api-guard";
import { raiseCampaignBid } from "@/server/services/advertising-campaign.service";

/**
 * Quick bid-only update, separate from the general (draft-only) campaign PATCH — lets a
 * builder respond to competition on a live campaign without touching targeting/schedule.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvertisingApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const campaignId = Number(id);
  if (!Number.isFinite(campaignId) || campaignId <= 0) {
    return NextResponse.json({ success: false, message: "Invalid campaign id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { maxBidCpm?: number };
  const result = await raiseCampaignBid(auth.builderId, campaignId, Number(body.maxBidCpm));
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, campaign: result.campaign });
}
