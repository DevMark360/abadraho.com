import { NextRequest, NextResponse } from "next/server";
import { requireAdminInquiryAccess } from "@/lib/admin-api-guard";
import { isFullStaff } from "@/lib/admin-rbac";
import {
  deletePropertyInquiry,
  getPropertyInquiry,
  redactInquiryForBuilder,
} from "@/server/services/admin-inquiry.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const inquiryId = Number(id);
  const auth = await requireAdminInquiryAccess(inquiryId);
  if (auth instanceof NextResponse) return auth;

  const result = await getPropertyInquiry(inquiryId);
  if (!result.inquiry) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Not found" },
      { status: 404 }
    );
  }

  const inquiry = isFullStaff(auth.session)
    ? result.inquiry
    : redactInquiryForBuilder(result.inquiry);

  return NextResponse.json({ success: true, inquiry, isFullStaff: isFullStaff(auth.session) });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const inquiryId = Number(id);
  const auth = await requireAdminInquiryAccess(inquiryId, "delete");
  if (auth instanceof NextResponse) return auth;

  await deletePropertyInquiry(inquiryId);
  return NextResponse.json({ success: true });
}
