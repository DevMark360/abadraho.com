import { NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { getYearlyActivityHeatmap } from "@/server/services/admin-heatmap.service";

export async function GET() {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;
  const days = await getYearlyActivityHeatmap();
  return NextResponse.json({ success: true, days });
}
