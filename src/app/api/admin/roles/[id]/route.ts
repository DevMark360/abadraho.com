import { NextRequest, NextResponse } from "next/server";
import { requireStaffPermission } from "@/lib/admin-api-guard";
import { moduleActionPermission } from "@/lib/staff-rbac";
import {
  deleteStaffRole,
  getStaffRole,
  updateStaffRole,
} from "@/server/services/admin-role.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffPermission(moduleActionPermission("roles", "view"));
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const result = await getStaffRole(Number(id));
  if (!result.role) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, role: result.role });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffPermission(moduleActionPermission("roles", "edit"));
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();
  const result = await updateStaffRole(Number(id), {
    name: body.name != null ? String(body.name) : undefined,
    description: body.description != null ? String(body.description) : undefined,
    permissions: Array.isArray(body.permissions) ? body.permissions.map(String) : undefined,
  });

  if (!result.success) {
    return NextResponse.json(result, { status: 422 });
  }
  return NextResponse.json(result);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffPermission(moduleActionPermission("roles", "delete"));
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const result = await deleteStaffRole(Number(id));
  if (!result.success) {
    return NextResponse.json(result, { status: 422 });
  }
  return NextResponse.json(result);
}
