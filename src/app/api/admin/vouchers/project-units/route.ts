import { NextRequest, NextResponse } from "next/server";
import { requireAdminProjectAccess } from "@/lib/admin-api-guard";
import { loadProjectUnits } from "@/server/services/admin-voucher.service";

export async function GET(request: NextRequest) {
  const projectId = Number(request.nextUrl.searchParams.get("projectId"));
  const excludeVoucherId =
    Number(request.nextUrl.searchParams.get("excludeVoucherId") ?? 0) || undefined;

  if (!projectId) {
    return NextResponse.json({ success: false, message: "projectId required" }, { status: 400 });
  }

  const auth = await requireAdminProjectAccess(projectId);
  if (auth instanceof NextResponse) return auth;

  const units = await loadProjectUnits(projectId, excludeVoucherId);
  return NextResponse.json({ success: true, units });
}
