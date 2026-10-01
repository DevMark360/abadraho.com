import { NextRequest, NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { decideAdCampaign } from "@/server/services/advertising-campaign.service";

const ACTIONS = new Set(["approve", "reject"]);

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

  const body = (await request.json()) as { action?: string; rejectionReason?: string };
  const action = body.action;
  if (!action || !ACTIONS.has(action)) {
    return NextResponse.json(
      { success: false, message: "action must be approve or reject" },
      { status: 400 }
    );
  }

  const result = await decideAdCampaign(
    campaignId,
    action as "approve" | "reject",
    body.rejectionReason
  );
  if (!result.success) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Update failed" },
      { status: 400 }
    );
  }
  return NextResponse.json({ success: true });
}
