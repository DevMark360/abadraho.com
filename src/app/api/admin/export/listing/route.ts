import { NextRequest, NextResponse } from "next/server";
import { rowsToCsv } from "@/lib/csv-export";
import { isFullStaff } from "@/lib/admin-rbac";
import { parsePropertyInquiryParams } from "@/lib/admin-inquiry-params";
import {
  listPropertyInquiries,
  redactInquiryForBuilder,
} from "@/server/services/admin-inquiry.service";
import {
  builderProjectIdsForExport,
  capExportRows,
  csvAttachmentResponse,
  requireScopedExport,
} from "@/lib/admin-export-route";

export async function GET(request: NextRequest) {
  const auth = await requireScopedExport();
  if (auth instanceof NextResponse) return auth;

  const fullStaff = isFullStaff(auth.session);

  try {
    const filters = parsePropertyInquiryParams(request.nextUrl.searchParams);
    filters.page = 1;
    filters.perPage = 50_000;
    filters.builderProjectIds = await builderProjectIdsForExport(auth.session);

    const result = await listPropertyInquiries(filters);
    const rows = fullStaff ? result.items : result.items.map((r) => redactInquiryForBuilder(r));
    const data = capExportRows(
      rows.map((r) =>
        fullStaff
          ? {
              id: r.id,
              date: r.createdAt,
              name: r.name,
              email: "email" in r ? r.email : null,
              phone: "phoneNumber" in r ? r.phoneNumber : null,
              address: "address" in r ? r.address : null,
              project: r.projectName,
              unit: r.unitTitle,
            }
          : {
              id: r.id,
              date: r.createdAt,
              name: r.name,
              project: r.projectName,
              unit: r.unitTitle,
            }
      )
    );
    const csv = fullStaff
      ? rowsToCsv(
          ["id", "date", "name", "email", "phone", "address", "project", "unit"],
          data
        )
      : rowsToCsv(["id", "date", "name", "project", "unit"], data);
    return csvAttachmentResponse(csv, `property-inquiries-${Date.now()}.csv`);
  } catch {
    return NextResponse.json(
      { success: false, message: "Export failed — check database connection." },
      { status: 500 }
    );
  }
}
