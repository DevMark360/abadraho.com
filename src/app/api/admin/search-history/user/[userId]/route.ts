import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { deleteUserSearchHistory } from "@/server/services/search-history.service";

type RouteContext = { params: Promise<{ userId: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { userId: raw } = await context.params;
  const userId = Number(raw);
  if (!Number.isFinite(userId) || userId <= 0) {
    return NextResponse.json({ success: false, message: "Invalid user id" }, { status: 400 });
  }

  const result = await deleteUserSearchHistory(userId);
  if (!result.success) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Delete failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Deleted",
    deleted: result.deleted,
  });
}
