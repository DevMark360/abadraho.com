import { NextRequest, NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import {
  listAssignmentRequests,
  decideAssignmentRequest,
  countPendingAssignmentRequests,
  deleteAssignmentRequest,
} from "@/server/services/broker-agent-ops.service";
import { COMMISSION_TYPES, type CommissionType } from "@/config/broker-agent";

export async function GET(req: NextRequest) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;

  const sp = req.nextUrl.searchParams;
  if (sp.get("count") === "pending") {
    const pending = await countPendingAssignmentRequests();
    return NextResponse.json({ success: true, pending });
  }

  const items = await listAssignmentRequests({
    status: sp.get("status") ?? undefined,
  });
  return NextResponse.json({ success: true, items });
}

export async function POST(req: NextRequest) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const id = Number(body.id);
  const decision = String(body.decision ?? "");

  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ success: false, message: "id required" }, { status: 400 });
  }
  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ success: false, message: "Invalid decision" }, { status: 400 });
  }

  const commissionType = body.commissionType as CommissionType | undefined;
  const commissionValue =
    body.commissionValue != null ? Number(body.commissionValue) : undefined;

  if (decision === "approved") {
    if (
      !commissionType ||
      !COMMISSION_TYPES.includes(commissionType) ||
      !Number.isFinite(commissionValue as number)
    ) {
      return NextResponse.json(
        { success: false, message: "Commission type and value are required to approve" },
        { status: 400 }
      );
    }
  }

  try {
    await decideAssignmentRequest(id, decision, {
      adminNotes: body.adminNotes ? String(body.adminNotes) : null,
      commissionType,
      commissionValue: commissionValue as number | undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;

  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ success: false, message: "id required" }, { status: 400 });
  }
  const deleted = await deleteAssignmentRequest(id);
  if (!deleted) {
    return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
