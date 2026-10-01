/** Default page size for /projects grid + infinite scroll batches. */
export const LISTINGS_PAGE_SIZE = 36;

/** Max items per page on unauthenticated public listing APIs. */
export const PUBLIC_MAX_PER_PAGE = 100;

export function clampPerPage(
  value: number | undefined,
  defaultValue: number,
  max = PUBLIC_MAX_PER_PAGE
): number {
  const n = value ?? defaultValue;
  if (!Number.isFinite(n) || n < 1) return Math.min(defaultValue, max);
  return Math.min(Math.floor(n), max);
}

export function clampPage(value: number | undefined): number {
  const n = value ?? 1;
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

/** Pass as the second argument to `parseProjectFilters` from public API routes. */
export const PUBLIC_PROJECT_LIST_OPTIONS = {
  maxPerPage: PUBLIC_MAX_PER_PAGE,
  defaultPerPage: LISTINGS_PAGE_SIZE,
} as const;

export function clampIdList(ids: number[] | undefined, max = PUBLIC_MAX_PER_PAGE): number[] {
  if (!ids?.length) return [];
  const unique = [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))];
  return unique.slice(0, max);
}
