import { resolvePublicSiteUrl } from "@/lib/seo";

/** Relative broker short-link path — always safe to open on the current origin/port. */
export function brokerShortLinkPath(slug: string, shortCode: string): string {
  const safeSlug = slug.trim();
  const safeCode = shortCode.trim();
  return `/p/${encodeURIComponent(safeSlug)}/${encodeURIComponent(safeCode)}`;
}

/** Absolute URL; pass request origin when available (ignored if localhost). */
export function brokerShortLinkUrl(
  slug: string,
  shortCode: string,
  origin?: string | null
): string {
  const path = brokerShortLinkPath(slug, shortCode);
  const base = resolvePublicSiteUrl(origin);
  return `${base}${path}`;
}
