import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { getUserSearchAnalytics } from "@/server/services/search-history.service";

type RouteContext = { params: Promise<{ userId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { userId: raw } = await context.params;
  const userId = Number(raw);
  if (!Number.isFinite(userId) || userId <= 0) {
    return NextResponse.json({ success: false, message: "Invalid user id" }, { status: 400 });
  }

  const result = await getUserSearchAnalytics(userId);

  if (!result.analytics) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, analytics: result.analytics });
}
