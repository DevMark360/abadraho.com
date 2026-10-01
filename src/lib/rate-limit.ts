import { NextResponse } from "next/server";

/** In-memory rate limiter (per server instance). Sufficient for dev/single-node. */

type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

// `store` only grows on write; without a sweep, sustained public traffic
// (bots hitting login/inquiry/contact) accumulates entries forever and can
// push a long-lived worker toward its heap ceiling.
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
const sweepTimer: unknown = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, SWEEP_INTERVAL_MS);
// Edge Runtime's setInterval returns a plain number with no .unref() (this
// module is pulled into middleware's edge bundle via security-log-edge.ts).
if (
  sweepTimer &&
  typeof sweepTimer === "object" &&
  "unref" in sweepTimer &&
  typeof sweepTimer.unref === "function"
) {
  sweepTimer.unref();
}

export const RATE_LIMITS = {
  /** Public + admin login */
  login: { max: 10, windowMs: 15 * 60 * 1000 },
  register: { max: 5, windowMs: 60 * 60 * 1000 },
  contact: { max: 5, windowMs: 60 * 60 * 1000 },
  /** Guest + signed-in property inquiries */
  inquiry: { max: 5, windowMs: 60 * 60 * 1000 },
  passwordResetRequest: { max: 5, windowMs: 60 * 60 * 1000 },
  passwordResetToken: { max: 10, windowMs: 60 * 60 * 1000 },
  /** Prevent user ID enumeration via /api/v1/auth/user-exists */
  userExists: { max: 30, windowMs: 15 * 60 * 1000 },
} as const;

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (entry.count >= maxAttempts) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  entry.count += 1;
  return { allowed: true };
}

/**
 * Client IP for rate-limit keys and logs. X-Real-IP is a last resort only: it is spoofable
 * without a proxy that sets it, but falling straight to "unknown" would put every visitor in
 * one shared bucket and lock everyone out of login.
 */
export function clientIp(request: Request): string {
  return trustedClientIp(request) ?? request.headers.get("x-real-ip")?.trim() ?? "unknown";
}

function isLoopback(ip: string): boolean {
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

/**
 * Client IP that a visitor cannot spoof. Prefers the socket peer address recorded by
 * server.js; behind local proxies (nginx/Apache in front of Passenger, loopback peer) takes the
 * right-most non-loopback X-Forwarded-For entry — the one appended by our own proxy chain.
 * Left-most entries are whatever the client sent and are never used.
 * Returns null when no per-visitor address is known (every request would share one key).
 */
export function trustedClientIp(request: Request): string | null {
  const peer = request.headers.get("x-abadraho-client-ip")?.trim();
  if (peer && !isLoopback(peer)) return peer;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      if (!isLoopback(parts[i])) return parts[i];
    }
  }
  return null;
}

export function enforceRateLimits(
  checks: { key: string; maxAttempts: number; windowMs: number }[]
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  for (const { key, maxAttempts, windowMs } of checks) {
    const limit = checkRateLimit(key, maxAttempts, windowMs);
    if (!limit.allowed) {
      return { allowed: false, retryAfterSec: limit.retryAfterSec ?? 60 };
    }
  }
  return { allowed: true };
}

export function rateLimitedResponse(retryAfterSec?: number): NextResponse {
  return NextResponse.json(
    { success: false, message: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: retryAfterSec ? { "Retry-After": String(retryAfterSec) } : undefined,
    }
  );
}
