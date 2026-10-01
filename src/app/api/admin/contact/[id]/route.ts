import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { getContactInquiry } from "@/server/services/admin-contact-inquiry.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await getContactInquiry(Number(id));
  if (!result.contact) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, contact: result.contact });
}
