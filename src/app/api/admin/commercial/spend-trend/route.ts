import { NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { getAdSpendTrend } from "@/server/services/admin-commercial.service";

export async function GET() {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;
  const points = await getAdSpendTrend();
  return NextResponse.json({ success: true, points });
}
