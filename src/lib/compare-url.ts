import { MAX_COMPARE } from "@/lib/client/compare-store";

/** Parse `/compare?ids=1,2` into up to two project ids. */
export function parseCompareUrlIds(raw?: string | null): number[] {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0)
    ),
  ].slice(0, MAX_COMPARE);
}
