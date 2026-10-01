import { NextRequest, NextResponse } from "next/server";
import { rowsToCsv } from "@/lib/csv-export";
import { parseSearchHistoryParams } from "@/lib/admin-search-history-params";
import { exportSearchHistoryRows } from "@/server/services/admin-search-history.service";
import {
  capExportRows,
  csvAttachmentResponse,
  requireStaffExport,
} from "@/lib/admin-export-route";

export async function GET(request: NextRequest) {
  const auth = await requireStaffExport();
  if (auth instanceof NextResponse) return auth;

  const sp = request.nextUrl.searchParams;
  const mode = (sp.get("mode") as "main" | "housing" | "advance") ?? "main";
  const filters = parseSearchHistoryParams(sp, mode);
  const fields = sp.get("fields")?.split(",").filter(Boolean) ?? [];

  const result = await exportSearchHistoryRows(filters, fields);
  if (result.error) {
    return NextResponse.json({ success: false, message: result.error }, { status: 500 });
  }

  const csv = rowsToCsv(result.headers ?? [], capExportRows(result.rows));
  const prefix =
    mode === "housing"
      ? "housing-calculator-search-history"
      : mode === "advance"
        ? "advance-search-history"
        : "user-search-history";

  return csvAttachmentResponse(csv, `${prefix}-${Date.now()}.csv`);
}
