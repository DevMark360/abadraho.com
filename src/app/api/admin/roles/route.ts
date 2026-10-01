import { NextRequest, NextResponse } from "next/server";
import { requireStaffPermission } from "@/lib/admin-api-guard";
import { moduleActionPermission } from "@/lib/staff-rbac";
import {
  createStaffRole,
  listStaffRoles,
} from "@/server/services/admin-role.service";

export async function GET() {
  const auth = await requireStaffPermission(moduleActionPermission("roles", "view"));
  if (auth instanceof NextResponse) return auth;

  const result = await listStaffRoles();
  return NextResponse.json({
    success: !result.error,
    items: result.items,
    error: result.error,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireStaffPermission(moduleActionPermission("roles", "add"));
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const result = await createStaffRole({
    name: String(body.name ?? ""),
    description: body.description != null ? String(body.description) : undefined,
    permissions: Array.isArray(body.permissions) ? body.permissions.map(String) : [],
  });

  if (!result.success) {
    return NextResponse.json(result, { status: 422 });
  }
  return NextResponse.json(result);
}
