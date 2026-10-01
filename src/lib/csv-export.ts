/** Mitigate spreadsheet formula injection (=, +, -, @, tab). */
function sanitizeCsvInjection(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) return `'${value}`;
  return value;
}

/** Escape a cell for CSV (RFC-style, quoted when needed). */
function cell(value: unknown): string {
  if (value == null) return "";
  let s =
    value instanceof Date
      ? value.toISOString()
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  s = sanitizeCsvInjection(s);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => cell(row[h])).join(","));
  }
  return lines.join("\r\n");
}
