import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import {
  readValidatedCsvText,
  resolveUploadPath,
  sanitizeUploadFilename,
} from "@/lib/admin-file-upload";

const IMPORT_DIR = path.join(process.cwd(), "public", "uploads", "project_imports");

/** Accept CSV upload — stored for manual/batch processing (legacy: public/uploads/project_imports) */
export async function POST(request: NextRequest) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;

  const form = await request.formData();
  const file = form.get("projects");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ success: false, message: "CSV file required" }, { status: 400 });
  }

  const csv = await readValidatedCsvText(file);
  if (!csv.ok) {
    return NextResponse.json({ success: false, message: csv.error }, { status: 400 });
  }

  await mkdir(IMPORT_DIR, { recursive: true });
  const name = sanitizeUploadFilename(file.name, "projects");
  await writeFile(resolveUploadPath(IMPORT_DIR, name), csv.text, "utf8");

  return NextResponse.json({
    success: true,
    message: `File saved as ${name}. Row import parser can be wired to match legacy HomeController@importCsvProjects.`,
    file: name,
  });
}
