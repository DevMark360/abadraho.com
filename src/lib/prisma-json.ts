/** MySQL BIGINT / DECIMAL from $queryRaw often arrives as bigint — JSON.stringify breaks without this */
export function jsonNum(value: unknown): number {
  if (value == null || value === "") return 0;
  if (typeof value === "bigint") return Number(value);
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function jsonNumOrNull(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "bigint") return Number(value);
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Recursively coerce Prisma/MySQL values into JSON-safe primitives. */
export function toJsonSafe<T>(value: T): T {
  if (value == null) return value;
  if (typeof value === "bigint") return Number(value) as T;
  if (value instanceof Date) return value.toISOString() as T;
  if (typeof value === "object" && "toNumber" in (value as object)) {
    return Number((value as unknown as { toNumber: () => number }).toNumber()) as T;
  }
  if (Array.isArray(value)) return value.map((item) => toJsonSafe(item)) as T;
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = toJsonSafe(v);
    }
    return out as T;
  }
  return value;
}
