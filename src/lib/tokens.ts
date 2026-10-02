import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { getAuthSecret } from "@/lib/auth-secret";

export { getAuthSecret };

function secret(): string {
  return getAuthSecret();
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/** Laravel-style email verification hash */
export function emailVerificationHash(userId: number, email: string): string {
  return createHmac("sha256", secret())
    .update(`${userId}:${email}`)
    .digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export function verifyEmailHash(userId: number, email: string, hash: string): boolean {
  const normalized = email.trim().toLowerCase();
  const candidates = normalized === email.trim() ? [normalized] : [normalized, email.trim()];

  // Old Laravel links (sha1(email)) are no longer accepted: Laravel also checked a signed
  // URL, but here sha1(email) alone let anyone who knew an address mark it verified.
  for (const em of candidates) {
    if (safeEqualHex(emailVerificationHash(userId, em), hash)) return true;
  }
  return false;
}

export function oauthStateToken(): string {
  return randomToken(16);
}
