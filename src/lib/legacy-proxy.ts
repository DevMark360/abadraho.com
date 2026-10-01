/** Legacy Laravel bridge — disabled; data comes from MySQL + local `public/` only. */

/** Base URL for optional legacy admin links (client-safe via NEXT_PUBLIC_*). */
export const LEGACY_SITE = (
  process.env.NEXT_PUBLIC_LEGACY_SITE_URL ?? ""
).replace(/\/$/, "");

export function isLegacyBridgeEnabled(): boolean {
  return Boolean(
    process.env.LEGACY_API_URL?.trim() ||
      process.env.NEXT_PUBLIC_LEGACY_SITE_URL?.trim()
  );
}

export type LegacyProxyTarget = "site" | "api";

const GONE_BODY = JSON.stringify({
  success: false,
  message: "Legacy site bridge is disabled. Use v2 API routes and MySQL.",
});

/** @deprecated Returns 410 — do not call legacy hosts */
export async function legacyProxy(
  _path: string,
  _init?: RequestInit & { target?: LegacyProxyTarget }
): Promise<Response> {
  return new Response(GONE_BODY, {
    status: 410,
    headers: { "Content-Type": "application/json" },
  });
}

export async function legacyProxyJson<T = unknown>(
  _path: string,
  _init?: RequestInit & { target?: LegacyProxyTarget }
): Promise<{ ok: boolean; status: number; data: T | null }> {
  return { ok: false, status: 410, data: null };
}
