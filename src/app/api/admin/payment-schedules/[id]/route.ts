import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-api-guard";
import { requireBuilderProjectAccess } from "@/lib/admin-builder-ownership";
import { isBuilderSession } from "@/lib/admin-rbac";
import { getPaymentSchedule } from "@/server/services/admin-payment-schedule.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminSession();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const result = await getPaymentSchedule(Number(id));
  if (!result.record) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Not found" },
      { status: 404 }
    );
  }

  if (
    isBuilderSession(auth.session) &&
    result.record.projectId != null
  ) {
    const access = await requireBuilderProjectAccess(
      auth.session,
      result.record.projectId
    );
    if (access instanceof NextResponse) return access;
  }

  return NextResponse.json({ success: true, record: result.record });
}
