import { NextRequest, NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import {
  listCommissions,
  updateCommissionStatus,
} from "@/server/services/broker-agent-ops.service";

export async function GET(req: NextRequest) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  const items = await listCommissions({
    brokerId: sp.get("brokerId") ? Number(sp.get("brokerId")) : undefined,
    projectId: sp.get("projectId") ? Number(sp.get("projectId")) : undefined,
    status: sp.get("status") ?? undefined,
    month: sp.get("month") ?? undefined,
  });
  return NextResponse.json({ success: true, items });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const id = Number(body.id);
  const action = String(body.action ?? "");
  if (!Number.isFinite(id)) {
    return NextResponse.json({ success: false, message: "id required" }, { status: 400 });
  }

  if (action === "confirm") {
    await updateCommissionStatus(id, "confirmed");
    return NextResponse.json({ success: true });
  }
  if (action === "paid") {
    await updateCommissionStatus(id, "paid", {
      paymentReference: body.paymentReference ? String(body.paymentReference) : undefined,
      paidAt: body.paidAt ? new Date(String(body.paidAt)) : new Date(),
      paymentNotes: body.paymentNotes ? String(body.paymentNotes) : undefined,
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
}
