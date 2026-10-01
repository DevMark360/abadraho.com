import { NextRequest, NextResponse } from "next/server";
import { requireStaffAdminModule } from "@/lib/admin-api-guard";
import {
  archiveBlogCategory,
  saveBlogCategory,
} from "@/server/services/admin-blog.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffAdminModule("blog_categories", "edit");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();
  const result = await saveBlogCategory(Number(id), String(body.title ?? ""));
  return NextResponse.json(result, { status: result.success ? 200 : 422 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffAdminModule("blog_categories", "delete");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await archiveBlogCategory(Number(id));
  return NextResponse.json({ success: true });
}
