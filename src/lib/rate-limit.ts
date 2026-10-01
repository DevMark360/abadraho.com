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

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
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
