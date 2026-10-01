import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { listAdminCustomers } from "@/server/services/admin-user.service";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const result = await listAdminCustomers({
    page: Number(sp.get("page") ?? 1) || 1,
    perPage: Number(sp.get("perPage") ?? 50) || 50,
    q: sp.get("q") ?? undefined,
  });

  return NextResponse.json({
    success: !result.error,
    items: result.items,
    total: result.total,
    error: result.error,
  });
}
