import { NextRequest, NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { decideAdWalletTransaction } from "@/server/services/advertising-wallet.service";

const ACTIONS = new Set(["confirm", "reject"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const transactionId = Number(id);
  if (!Number.isFinite(transactionId) || transactionId <= 0) {
    return NextResponse.json({ success: false, message: "Invalid transaction id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { action?: string; reason?: string };
  const action = body.action;
  if (!action || !ACTIONS.has(action)) {
    return NextResponse.json(
      { success: false, message: "action must be confirm or reject" },
      { status: 400 }
    );
  }

  const result = await decideAdWalletTransaction(
    transactionId,
    action as "confirm" | "reject",
    { source: auth.session.source ?? "admin", id: auth.session.id },
    body.reason
  );
  if (!result.success) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Update failed" },
      { status: 400 }
    );
  }
  return NextResponse.json({ success: true, balance: result.balance });
}
