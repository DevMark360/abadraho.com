import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { parseSearchHistoryParams } from "@/lib/admin-search-history-params";
import {
  listSearchHistory,
  loadSearchHistoryFilterOptions,
} from "@/server/services/admin-search-history.service";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const filters = parseSearchHistoryParams(request.nextUrl.searchParams, "main");
  const [result, filterOptions] = await Promise.all([
    listSearchHistory(filters),
    loadSearchHistoryFilterOptions(),
  ]);

  return NextResponse.json({
    success: !result.error,
    items: result.items,
    total: result.total,
    filterOptions,
    error: result.error,
  });
}
