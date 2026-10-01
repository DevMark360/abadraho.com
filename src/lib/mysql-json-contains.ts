/** Whitelisted JSON paths for JSON_CONTAINS filters (prevents path injection). */
const ALLOWED_JSON_PATHS = new Set([
  "area",
  "progress",
  "type",
  "builder",
  "projectType",
  "duration",
]);

export type SqlFragment = { sql: string; params: unknown[] };

/**
 * Parameterized JSON_CONTAINS — never inline user values or paths into SQL.
 * `path` must be a known key; `value` is bound as a prepared-statement param.
 */
export function jsonContainsFragment(
  col: string,
  path: string,
  value: string | number
): SqlFragment {
  if (!ALLOWED_JSON_PATHS.has(path)) {
    throw new Error(`Invalid JSON filter path: ${path}`);
  }
  const jsonVal = typeof value === "number" ? String(value) : JSON.stringify(value);
  return {
    sql: `JSON_CONTAINS(${col}, ?, '$.${path}')`,
    params: [jsonVal],
  };
}

export function joinSqlOr(fragments: SqlFragment[]): SqlFragment {
  if (!fragments.length) return { sql: "1=0", params: [] };
  return {
    sql: `(${fragments.map((f) => f.sql).join(" OR ")})`,
    params: fragments.flatMap((f) => f.params),
  };
}

export function joinSqlAnd(fragments: SqlFragment[]): SqlFragment {
  if (!fragments.length) return { sql: "1=1", params: [] };
  return {
    sql: `(${fragments.map((f) => f.sql).join(" AND ")})`,
    params: fragments.flatMap((f) => f.params),
  };
}

export function safePositiveInts(ids: number[] | undefined): number[] {
  if (!ids?.length) return [];
  return ids.filter((n) => Number.isInteger(n) && n > 0);
}

export function safeFilterStrings(values: string[] | undefined, maxLen = 100): string[] {
  if (!values?.length) return [];
  return values.map((s) => String(s).trim().slice(0, maxLen)).filter(Boolean);
}

export function safeFilterString(value: string | undefined, maxLen = 100): string | undefined {
  const s = value?.trim().slice(0, maxLen);
  return s || undefined;
}
