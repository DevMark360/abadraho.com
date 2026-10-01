import { NextRequest, NextResponse } from "next/server";
import { requireStaffAdminModule } from "@/lib/admin-api-guard";
import {
  archiveAdminBuilder,
  getAdminBuilder,
  loadBuilderUserOptions,
  saveAdminBuilder,
} from "@/server/services/admin-builder.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffAdminModule("builders", "view");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const [result, builderUsers] = await Promise.all([
    getAdminBuilder(Number(id)),
    loadBuilderUserOptions(),
  ]);

  if (!result.builder) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, builder: result.builder, builderUsers });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffAdminModule("builders", "edit");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();
  const result = await saveAdminBuilder(Number(id), body);
  if (result.error) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, id: result.builder?.id });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffAdminModule("builders", "delete");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await archiveAdminBuilder(Number(id));
  return NextResponse.json({ success: true });
}
