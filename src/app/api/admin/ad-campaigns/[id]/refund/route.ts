import { NextRequest, NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { issueAdCampaignRefund } from "@/server/services/advertising-campaign.service";

/**
 * Admin-triggered only (never automatic) — an admin reviews a completed campaign's undelivered
 * impression/budget value and explicitly decides to credit it back to the builder's wallet.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const campaignId = Number(id);
  if (!Number.isFinite(campaignId) || campaignId <= 0) {
    return NextResponse.json({ success: false, message: "Invalid campaign id" }, { status: 400 });
  }

  const result = await issueAdCampaignRefund(campaignId, {
    source: auth.session.source ?? "admin",
    id: auth.session.id,
  });
  if (!result.success) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Refund failed" },
      { status: 400 }
    );
  }
  return NextResponse.json({ success: true, amount: result.amount });
}
