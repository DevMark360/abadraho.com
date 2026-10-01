import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { builderProjectIdsForSession } from "@/lib/admin-builder-ownership";
import { listDownloadedVouchers } from "@/server/services/admin-voucher.service";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const filters: {
    page?: number;
    perPage?: number;
    q?: string;
    builderProjectIds?: number[];
  } = {
    page: Number(sp.get("page") ?? 1),
    perPage: Number(sp.get("perPage") ?? 100),
    q: sp.get("q") ?? undefined,
  };

  const builderScope = await builderProjectIdsForSession(session);
  if (builderScope !== undefined) {
    filters.builderProjectIds = builderScope;
  }

  const result = await listDownloadedVouchers(filters);

  return NextResponse.json({
    success: !result.error,
    items: result.items,
    total: result.total,
    error: result.error,
  });
}
