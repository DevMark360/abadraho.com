/** Parse payment_schedule.json (JSON or legacy PHP-serialized). */
export function parsePaymentPayload(raw: string | null | undefined): Record<string, unknown> {
  if (!raw?.trim()) return {};
  try {
    const j = JSON.parse(raw);
    if (typeof j === "object" && j && !Array.isArray(j)) return j as Record<string, unknown>;
  } catch {
    /* legacy PHP serialize */
  }
  const out: Record<string, unknown> = {};
  const dur = raw.match(/duration";a:\d+:\{([^}]*)\}/);
  if (dur) {
    out.duration = [...dur[1].matchAll(/s:\d+:"([^"]*)"/g)].map((m) => m[1]);
  }
  return out;
}

export function formatDuration(raw: string | null | undefined): string {
  const p = parsePaymentPayload(raw);
  const d = p.duration;
  if (Array.isArray(d) && d.length) return d.map(String).join(", ");
  if (d != null && d !== "") return String(d);
  return "—";
}
