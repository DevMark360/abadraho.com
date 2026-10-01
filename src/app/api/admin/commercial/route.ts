import { NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { getCommercialSnapshot } from "@/server/services/admin-commercial.service";

export async function GET() {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;
  const snapshot = await getCommercialSnapshot();
  return NextResponse.json({ success: true, snapshot });
}
