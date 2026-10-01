import { NextRequest, NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { listAllAdWhatsappPackages } from "@/server/services/advertising-whatsapp.service";

export async function GET(request: NextRequest) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;

  const sp = request.nextUrl.searchParams;
  const result = await listAllAdWhatsappPackages({
    page: Number(sp.get("page") ?? 1),
    pageSize: Number(sp.get("perPage") ?? 25),
  });
  return NextResponse.json({ success: true, ...result });
}
