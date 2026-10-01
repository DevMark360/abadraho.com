import { NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { getFinanceSummary } from "@/server/services/admin-finance.service";

export async function GET() {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;
  const summary = await getFinanceSummary();
  return NextResponse.json({ success: true, summary });
}
