import { NextRequest, NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { listUsersForNotify } from "@/server/services/admin-user.service";
import { notifyAdCampaignUsers } from "@/server/services/advertising-campaign.service";

export async function GET(_request: NextRequest) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;

  const items = await listUsersForNotify();
  return NextResponse.json({ success: true, items });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const campaignId = Number(id);
  if (!Number.isFinite(campaignId) || campaignId <= 0) {
    return NextResponse.json({ success: false, message: "Invalid campaign id" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const userIds = Array.isArray(body.userIds)
    ? body.userIds.map((v: unknown) => Number(v)).filter((v: number) => Number.isFinite(v))
    : [];

  const result = await notifyAdCampaignUsers(campaignId, userIds, auth.session);
  if (result.error) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, count: result.count });
}
