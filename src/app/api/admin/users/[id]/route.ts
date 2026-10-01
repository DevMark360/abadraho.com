import { NextRequest, NextResponse } from "next/server";
import { requireStaffAdminModule } from "@/lib/admin-api-guard";
import {
  archiveAdminUser,
  getAdminUser,
  loadUserTypesForAdmin,
  saveAdminUser,
} from "@/server/services/admin-user.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffAdminModule("users", "view");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const userId = Number(id);
  const [result, userTypes] = await Promise.all([
    getAdminUser(userId),
    loadUserTypesForAdmin(),
  ]);

  if (!result.user) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, user: result.user, userTypes });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffAdminModule("users", "edit");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();
  const result = await saveAdminUser(Number(id), body);
  if (result.error) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, id: result.user?.id });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffAdminModule("users", "delete");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await archiveAdminUser(Number(id));
  return NextResponse.json({ success: true });
}
