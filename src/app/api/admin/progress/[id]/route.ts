import { NextRequest, NextResponse } from "next/server";
import { requireStaffAdminModule } from "@/lib/admin-api-guard";
import {
  archiveAdminProgress,
  getAdminProgress,
  saveAdminProgress,
} from "@/server/services/admin-progress.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffAdminModule("progress", "view");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const result = await getAdminProgress(Number(id));
  if (!result.progress) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, progress: result.progress });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffAdminModule("progress", "edit");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();
  const result = await saveAdminProgress(Number(id), {
    name: String(body.name ?? body.progress_status_name ?? ""),
    isActive: body.isActive === true || body.isActive === 1 || body.isActive === "1",
  });

  return NextResponse.json(result, { status: result.success ? 200 : 422 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaffAdminModule("progress", "delete");
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await archiveAdminProgress(Number(id));
  return NextResponse.json({ success: true, message: "Progress deleted successfully" });
}
