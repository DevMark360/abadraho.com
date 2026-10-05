import { NextRequest, NextResponse } from "next/server";
import { rowsToCsv } from "@/lib/csv-export";
import { parseContactInquiryParams } from "@/lib/admin-inquiry-params";
import { listContactInquiries } from "@/server/services/admin-contact-inquiry.service";
import {
  capExportRows,
  csvAttachmentResponse,
  requireStaffExport,
} from "@/lib/admin-export-route";

export async function GET(request: NextRequest) {
  const auth = await requireStaffExport();
  if (auth instanceof NextResponse) return auth;

  try {
    const filters = parseContactInquiryParams(request.nextUrl.searchParams);
    const result = await listContactInquiries(filters);
    const data = capExportRows(
      result.items.map((r) => ({
        id: r.id,
        date: r.createdAt,
        name: r.name,
        email: r.email,
        phone: r.phone,
        subject: r.subject,
        message: r.message,
      }))
    );
    const csv = rowsToCsv(
      ["id", "date", "name", "email", "phone", "subject", "message"],
      data
    );
    return csvAttachmentResponse(csv, `contact-inquiries-${Date.now()}.csv`);
  } catch {
    return NextResponse.json(
      { success: false, message: "Export failed. Check the database connection." },
      { status: 500 }
    );
  }
}
