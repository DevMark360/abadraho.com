import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { parseContactInquiryParams } from "@/lib/admin-inquiry-params";
import { listContactInquiries } from "@/server/services/admin-contact-inquiry.service";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const filters = parseContactInquiryParams(request.nextUrl.searchParams);
  const result = await listContactInquiries(filters);

  return NextResponse.json({
    success: !result.error,
    items: result.items,
    error: result.error,
  });
}
