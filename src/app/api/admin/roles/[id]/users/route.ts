import { NextRequest, NextResponse } from "next/server";
import { requireStaffPermission } from "@/lib/admin-api-guard";
import { moduleActionPermission } from "@/lib/staff-rbac";
import {
  assignUserToStaffRole,
  removeUserFromStaffRole,
} from "@/server/services/admin-role.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffPermission(moduleActionPermission("roles", "edit"));
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();
  const source = body.source === "admin" ? "admin" : "user";
  const userId = Number(body.id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ success: false, message: "Invalid user id" }, { status: 400 });
  }

  const result = await assignUserToStaffRole(Number(id), { source, id: userId });
  if (!result.success) {
    return NextResponse.json(result, { status: 422 });
  }
  return NextResponse.json(result);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffPermission(moduleActionPermission("roles", "edit"));
  if (auth instanceof NextResponse) return auth;

  await params;
  const body = await request.json();
  const source = body.source === "admin" ? "admin" : "user";
  const userId = Number(body.id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ success: false, message: "Invalid user id" }, { status: 400 });
  }

  const result = await removeUserFromStaffRole({ source, id: userId });
  return NextResponse.json(result);
}
