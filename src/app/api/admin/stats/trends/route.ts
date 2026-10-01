import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-api-guard";
import { getBuilderScopeProjectIds } from "@/lib/admin-builder-ownership";
import { getStatCardTrends } from "@/server/services/admin-analytics.service";

export async function GET() {
  const auth = await requireAdminSession();
  if (auth instanceof NextResponse) return auth;
  const builderScope = await getBuilderScopeProjectIds(auth.session);
  const trends = await getStatCardTrends(builderScope);
  return NextResponse.json({ success: true, trends });
}
