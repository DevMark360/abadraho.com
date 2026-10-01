import { NextRequest, NextResponse } from "next/server";
import { requireModulePermission } from "@/lib/admin-api-permissions";
import { getAdminSession } from "@/lib/admin-session";
import {
  deleteSearchHistory,
  getSearchHistoryDetail,
  searchHistoryDeletePermissionModule,
} from "@/server/services/admin-search-history.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 });
  }

  const result = await getSearchHistoryDetail(numId);
  if (!result.record) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, record: result.record });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 });
  }

  const detail = await getSearchHistoryDetail(numId);
  if (!detail.record) {
    return NextResponse.json(
      { success: false, message: detail.error ?? "Not found" },
      { status: 404 }
    );
  }

  const moduleKey = searchHistoryDeletePermissionModule(detail.record.searchType);
  if (moduleKey) {
    const denied = await requireModulePermission(session, moduleKey, "delete");
    if (denied) return denied;
  }

  const result = await deleteSearchHistory(numId);
  if (!result.success) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Delete failed" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, message: "Deleted" });
}
