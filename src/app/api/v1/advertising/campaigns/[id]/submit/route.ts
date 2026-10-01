import { NextRequest, NextResponse } from "next/server";
import { requireAdvertisingApi } from "@/lib/advertising-api-guard";
import { submitAdCampaign } from "@/server/services/advertising-campaign.service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdvertisingApi();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const campaignId = Number(id);
  if (!Number.isFinite(campaignId) || campaignId <= 0) {
    return NextResponse.json({ success: false, message: "Invalid campaign id" }, { status: 400 });
  }

  const result = await submitAdCampaign(auth.builderId, campaignId);
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, campaign: result.campaign, autoApproved: result.autoApproved });
}
