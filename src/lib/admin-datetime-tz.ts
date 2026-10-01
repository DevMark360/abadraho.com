/** Admin project "Added time" — datetime-local + IANA timezone. */

export const DEFAULT_ADMIN_TIMEZONE =
  process.env.NEXT_PUBLIC_ADMIN_TIMEZONE?.trim() || "Asia/Karachi";

export const ADMIN_TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "Asia/Karachi", label: "Pakistan (PKT, UTC+5)" },
  { value: "Asia/Dubai", label: "UAE (GST, UTC+4)" },
  { value: "Asia/Riyadh", label: "Saudi Arabia (AST, UTC+3)" },
  { value: "Asia/Kolkata", label: "India (IST, UTC+5:30)" },
  { value: "Europe/London", label: "UK (GMT/BST)" },
  { value: "America/New_York", label: "US Eastern" },
  { value: "UTC", label: "UTC" },
];

type WallTime = { y: number; mo: number; d: number; h: number; mi: number };

function wallPartsInTimeZone(date: Date, timeZone: string): WallTime {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  return {
    y: get("year"),
    mo: get("month"),
    d: get("day"),
    h: get("hour"),
    mi: get("minute"),
  };
}

function compareWall(a: WallTime, b: WallTime): number {
  return (
    a.y - b.y ||
    a.mo - b.mo ||
    a.d - b.d ||
    a.h - b.h ||
    a.mi - b.mi
  );
}

/** Format a UTC instant for `<input type="datetime-local">` in the given timezone. */
export function formatDatetimeLocalInTimeZone(date: Date, timeZone: string): string {
  const p = wallPartsInTimeZone(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

/** Current date/time as datetime-local string in the given timezone. */
export function datetimeLocalNow(timeZone: string = DEFAULT_ADMIN_TIMEZONE): string {
  return formatDatetimeLocalInTimeZone(new Date(), timeZone);
}

/**
 * Parse datetime-local value as wall-clock time in `timeZone`, return UTC Date.
 * Accepts `YYYY-MM-DDTHH:mm`.
 */
export function parseDatetimeLocalInTimeZone(value: string, timeZone: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return new Date(value);

  const target: WallTime = {
    y: Number(m[1]),
    mo: Number(m[2]),
    d: Number(m[3]),
    h: Number(m[4]),
    mi: Number(m[5]),
  };

  let lo = Date.UTC(target.y, target.mo - 1, target.d, target.h - 14, target.mi);
  let hi = Date.UTC(target.y, target.mo - 1, target.d, target.h + 14, target.mi);

  for (let i = 0; i < 48; i++) {
    const mid = Math.floor((lo + hi) / 2);
    const cmp = compareWall(wallPartsInTimeZone(new Date(mid), timeZone), target);
    if (cmp === 0) return new Date(mid);
    if (cmp < 0) lo = mid + 1;
    else hi = mid - 1;
  }

  return new Date(Date.UTC(target.y, target.mo - 1, target.d, target.h, target.mi));
}
