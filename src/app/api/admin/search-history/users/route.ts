import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { listUsersWithActivity } from "@/server/services/search-history.service";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(sp.get("perPage") ?? 25)));
  const search = sp.get("search") ?? undefined;
  const from = sp.get("from") ?? undefined;
  const to = sp.get("to") ?? undefined;

  const result = await listUsersWithActivity({ page, perPage, search, from, to });

  return NextResponse.json({
    success: !result.error,
    items: result.items,
    total: result.total,
    error: result.error,
  });
}
