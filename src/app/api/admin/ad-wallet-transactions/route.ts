import { NextRequest, NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { listAdminAdWalletTransactions } from "@/server/services/admin-advertising.service";

export async function GET(request: NextRequest) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;

  const sp = request.nextUrl.searchParams;
  const result = await listAdminAdWalletTransactions({
    page: Number(sp.get("page") ?? 1),
    perPage: Number(sp.get("perPage") ?? 25),
    status: sp.get("status") || undefined,
  });
  return NextResponse.json({ success: true, ...result });
}
