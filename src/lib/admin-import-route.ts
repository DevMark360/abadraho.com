import { NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { validateCsvImport } from "@/lib/admin-file-upload";

export async function requireCsvImportUpload(
  file: FormDataEntryValue | null
): Promise<{ file: File } | NextResponse> {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ success: false, message: "CSV file required" }, { status: 400 });
  }

  const validation = validateCsvImport(file);
  if (!validation.ok) {
    return NextResponse.json({ success: false, message: validation.error }, { status: 400 });
  }

  return { file };
}
