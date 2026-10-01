import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-api-guard";
import { getBuilderScopeProjectIds } from "@/lib/admin-builder-ownership";
import { adminDashboardStats } from "@/server/services/admin-crud.service";

export async function GET() {
  const auth = await requireAdminSession();
  if (auth instanceof NextResponse) return auth;
  const builderScope = await getBuilderScopeProjectIds(auth.session);
  const stats = await adminDashboardStats(builderScope);
  return NextResponse.json({ success: true, stats });
}
