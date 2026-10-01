import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-api-guard";
import { getBuilderScopeProjectIds } from "@/lib/admin-builder-ownership";
import {
  getDashboardAnalytics,
  type AnalyticsRange,
} from "@/server/services/admin-analytics.service";
import { toJsonSafe } from "@/lib/prisma-json";

const RANGES = new Set<AnalyticsRange>(["week", "month", "year"]);

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession();
  if (auth instanceof NextResponse) return auth;

  const raw = request.nextUrl.searchParams.get("range") ?? "month";
  const range: AnalyticsRange = RANGES.has(raw as AnalyticsRange)
    ? (raw as AnalyticsRange)
    : "month";

  const builderScope = await getBuilderScopeProjectIds(auth.session);
  const analytics = await getDashboardAnalytics(range, builderScope);
  return NextResponse.json(toJsonSafe({ success: true, analytics }));
}
