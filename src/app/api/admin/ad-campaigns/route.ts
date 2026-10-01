import { NextRequest, NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { listAdminAdCampaigns } from "@/server/services/admin-advertising.service";

export async function GET(request: NextRequest) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;

  const sp = request.nextUrl.searchParams;
  const result = await listAdminAdCampaigns({
    page: Number(sp.get("page") ?? 1),
    perPage: Number(sp.get("perPage") ?? 25),
    status: sp.get("status") || undefined,
    showArchived: sp.get("archived") === "true",
  });
  return NextResponse.json({ success: true, ...result });
}
