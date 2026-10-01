import { NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { getAdminAdCampaignDetail } from "@/server/services/admin-advertising.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const campaignId = Number(id);
  if (!Number.isFinite(campaignId) || campaignId <= 0) {
    return NextResponse.json({ success: false, message: "Invalid campaign id" }, { status: 400 });
  }

  const campaign = await getAdminAdCampaignDetail(campaignId);
  if (!campaign) {
    return NextResponse.json({ success: false, message: "Campaign not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, campaign });
}
