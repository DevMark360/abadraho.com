import { NextRequest, NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { setAdCampaignArchived } from "@/server/services/advertising-campaign.service";

export async function PATCH(
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

  const body = (await request.json()) as { archived?: boolean };
  if (typeof body.archived !== "boolean") {
    return NextResponse.json(
      { success: false, message: "archived (boolean) is required" },
      { status: 400 }
    );
  }

  const result = await setAdCampaignArchived(campaignId, body.archived);
  if (!result.success) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Update failed" },
      { status: 400 }
    );
  }
  return NextResponse.json({ success: true });
}
