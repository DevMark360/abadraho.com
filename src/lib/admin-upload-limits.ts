/** Shared upload limits (safe for client + server imports). */

/** Max CSV import payload (areas, units, types, projects). */
export const ADMIN_CSV_MAX_BYTES = 5 * 1024 * 1024;
/** Max parsed CSV rows per import. */
export const ADMIN_CSV_MAX_ROWS = 10_000;
/** Max rows written to a single admin CSV export. */
export const ADMIN_EXPORT_MAX_ROWS = 50_000;

export const ADMIN_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const ADMIN_PDF_MAX_BYTES = 30 * 1024 * 1024;
export const ADMIN_PDF_MAX_LABEL = "30MB";
export const ADMIN_MAX_GALLERY_FILES = 20;
export const ADMIN_MAX_PROJECT_PDF_FILES = 10;

/** Worst-case single save: cover + full gallery + max PDF batch (+ multipart overhead). */
export const ADMIN_MAX_MEDIA_REQUEST_BYTES =
  ADMIN_IMAGE_MAX_BYTES * (1 + ADMIN_MAX_GALLERY_FILES) +
  ADMIN_PDF_MAX_BYTES * ADMIN_MAX_PROJECT_PDF_FILES +
  2 * 1024 * 1024;

/** Human-readable limit for Next.js `middlewareClientMaxBodySize` / `serverActions.bodySizeLimit`. */
export function formatNextBodySizeLimit(bytes: number): string {
  return `${Math.ceil(bytes / (1024 * 1024))}mb`;
}
