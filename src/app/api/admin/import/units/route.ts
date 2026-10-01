import { NextRequest, NextResponse } from "next/server";
import { requireCsvImportUpload } from "@/lib/admin-import-route";
import { importUnitsCsv } from "@/server/services/admin-import.service";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const upload = await requireCsvImportUpload(form.get("projects") ?? form.get("file"));
  if (upload instanceof NextResponse) return upload;

  const result = await importUnitsCsv(upload.file);
  return NextResponse.json(result, { status: result.success ? 200 : 422 });
}
