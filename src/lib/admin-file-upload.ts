import path from "node:path";
import {
  ADMIN_CSV_MAX_BYTES,
  ADMIN_IMAGE_MAX_BYTES,
  ADMIN_PDF_MAX_BYTES,
  ADMIN_PDF_MAX_LABEL,
} from "@/lib/admin-upload-limits";

export {
  ADMIN_CSV_MAX_BYTES,
  ADMIN_CSV_MAX_ROWS,
  ADMIN_EXPORT_MAX_ROWS,
  ADMIN_IMAGE_MAX_BYTES,
  ADMIN_MAX_GALLERY_FILES,
  ADMIN_MAX_PROJECT_PDF_FILES,
  ADMIN_PDF_MAX_BYTES,
  ADMIN_PDF_MAX_LABEL,
} from "@/lib/admin-upload-limits";
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);

export type UploadValidationResult = { ok: true } | { ok: false; error: string };

export function sanitizeUploadFilename(original: string, prefix?: string): string {
  const base = path.basename(original).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const safe = base || "file";
  return prefix ? `${Date.now()}-${prefix}-${safe}` : `${Date.now()}_${safe}`;
}

export function resolveUploadPath(baseDir: string, filename: string): string {
  const resolved = path.resolve(baseDir, filename);
  const base = path.resolve(baseDir);
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) {
    throw new Error("Invalid upload path");
  }
  return resolved;
}

export function validateCsvImport(file: File): UploadValidationResult {
  if (!file.size) return { ok: false, error: "Empty file" };
  if (file.size > ADMIN_CSV_MAX_BYTES) {
    return { ok: false, error: "CSV must be under 5MB" };
  }
  if (path.extname(file.name).toLowerCase() !== ".csv") {
    return { ok: false, error: "File must be a .csv" };
  }
  return { ok: true };
}

export async function readValidatedCsvText(
  file: File
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const validation = validateCsvImport(file);
  if (!validation.ok) return validation;

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > ADMIN_CSV_MAX_BYTES) {
    return { ok: false, error: "CSV must be under 5MB" };
  }
  if (buf.includes(0)) {
    return { ok: false, error: "Invalid CSV content" };
  }

  return { ok: true, text: buf.toString("utf8") };
}

export function validateImageFile(
  file: File,
  maxBytes = ADMIN_IMAGE_MAX_BYTES
): UploadValidationResult {
  if (!file.size) return { ok: false, error: "Empty file" };
  if (file.size > maxBytes) {
    return { ok: false, error: "Image must be under 5MB" };
  }
  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  if (!IMAGE_EXTENSIONS.has(ext)) {
    return { ok: false, error: "Image must be JPG, PNG, GIF, or WebP" };
  }
  return { ok: true };
}

export function validatePdfFile(
  file: File,
  maxBytes = ADMIN_PDF_MAX_BYTES
): UploadValidationResult {
  if (!file.size) return { ok: false, error: "Empty file" };
  if (file.size > maxBytes) {
    return { ok: false, error: `PDF must be ${ADMIN_PDF_MAX_LABEL} or smaller` };
  }
  if (path.extname(file.name).toLowerCase() !== ".pdf") {
    return { ok: false, error: "Document must be a PDF" };
  }
  return { ok: true };
}

export function imageExtension(file: File): string {
  const ext = path.extname(file.name).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext) ? ext : ".jpg";
}
