import { NextResponse } from "next/server";
import { rowsToCsv } from "@/lib/csv-export";
import { listPaymentSchedules } from "@/server/services/admin-payment-schedule.service";
import {
  builderProjectIdsForExport,
  capExportRows,
  csvAttachmentResponse,
  requireScopedExport,
} from "@/lib/admin-export-route";

export async function GET() {
  const auth = await requireScopedExport();
  if (auth instanceof NextResponse) return auth;

  try {
    const builderProjectIds = await builderProjectIdsForExport(auth.session);
    const result = await listPaymentSchedules(
      builderProjectIds !== undefined ? { builderProjectIds } : {}
    );
    const data = capExportRows(
      result.items.map((r) => ({
        id: r.id,
        date: r.createdAt,
        user: r.userName,
        phone: r.phone,
        email: r.email,
        project: r.projectName,
        unit: r.unitTitle,
        duration: r.duration,
        down_payment: r.downPayment,
        monthly_installment: r.monthlyInstallment,
      }))
    );
    const csv = rowsToCsv(
      [
        "id",
        "date",
        "user",
        "phone",
        "email",
        "project",
        "unit",
        "duration",
        "down_payment",
        "monthly_installment",
      ],
      data
    );
    return csvAttachmentResponse(csv, `payment-schedules-${Date.now()}.csv`);
  } catch {
    return NextResponse.json(
      { success: false, message: "Export failed. Check the database connection." },
      { status: 500 }
    );
  }
}
