import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

/** HttpOnly cookie storing agent code (e.g. AGT-00042) for inquiry attribution. */
export const BROKER_ATTRIBUTION_COOKIE = "abadraho_agent";

const ATTRIBUTION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export function brokerAttributionCookieOptions(
  agentCode: string,
  maxAgeSec = ATTRIBUTION_MAX_AGE_SEC
): ResponseCookie {
  return {
    name: BROKER_ATTRIBUTION_COOKIE,
    value: agentCode.trim().toUpperCase(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: maxAgeSec,
    path: "/",
  };
}

export function normalizeAgentCode(code: string): string {
  return code.trim().toUpperCase();
}
