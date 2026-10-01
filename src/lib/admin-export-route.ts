import { NextResponse } from "next/server";
import { requireAdminSession, requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { ADMIN_EXPORT_MAX_ROWS } from "@/lib/admin-file-upload";
import type { AdminSession } from "@/lib/admin-session";
import { builderProjectIdsForSession } from "@/lib/admin-builder-ownership";

export async function requireStaffExport() {
  return requireFullStaffAdmin();
}

export async function requireScopedExport() {
  return requireAdminSession();
}

export function capExportRows<T>(rows: T[]): T[] {
  return rows.slice(0, ADMIN_EXPORT_MAX_ROWS);
}

export async function builderProjectIdsForExport(
  session: AdminSession
): Promise<number[] | undefined> {
  return builderProjectIdsForSession(session);
}

export function csvAttachmentResponse(csv: string, filename: string): NextResponse {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
