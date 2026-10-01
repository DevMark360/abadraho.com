import { NextRequest, NextResponse } from "next/server";
import { requireAdvertisingApi } from "@/lib/advertising-api-guard";
import {
  getAdCampaignForBuilder,
  getAdCampaignPacing,
  getAdCampaignSlotCompetition,
  getAdCampaignStats,
  updateDraftAdCampaign,
  type UpdateAdCampaignInput,
} from "@/server/services/advertising-campaign.service";

export async function GET(
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

  const [campaign, stats, pacing, slotCompetition] = await Promise.all([
    getAdCampaignForBuilder(auth.builderId, campaignId),
    getAdCampaignStats(auth.builderId, campaignId),
    getAdCampaignPacing(auth.builderId, campaignId),
    getAdCampaignSlotCompetition(auth.builderId, campaignId),
  ]);
  if (!campaign) {
    return NextResponse.json({ success: false, message: "Campaign not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, campaign, stats, pacing, slotCompetition });
}

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

  const body = (await request.json().catch(() => ({}))) as UpdateAdCampaignInput;
  const result = await updateDraftAdCampaign(auth.builderId, campaignId, body);
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, campaign: result.campaign });
}
