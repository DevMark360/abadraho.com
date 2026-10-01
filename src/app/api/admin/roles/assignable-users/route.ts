import { NextRequest, NextResponse } from "next/server";
import { requireStaffPermission } from "@/lib/admin-api-guard";
import { moduleActionPermission } from "@/lib/staff-rbac";
import { searchStaffAssignableUsers } from "@/server/services/admin-role.service";

export async function GET(request: NextRequest) {
  const auth = await requireStaffPermission(moduleActionPermission("roles", "edit"));
  if (auth instanceof NextResponse) return auth;

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const items = await searchStaffAssignableUsers(q);
  return NextResponse.json({ success: true, items });
}
