/** Normalize DB path to a public URL path under /uploads/... (client-safe, no Node APIs) */
export function normalizeUploadPublicPath(raw: string): string {
  const trimmed = raw.trim().replace(/^\/+/, "");
  if (trimmed.startsWith("uploads/")) return `/${trimmed}`;
  const idx = trimmed.indexOf("/uploads/");
  if (idx >= 0) return trimmed.slice(idx);
  if (trimmed.startsWith("storage/")) return `/${trimmed}`;
  return `/uploads/project_images/${trimmed}`;
}
