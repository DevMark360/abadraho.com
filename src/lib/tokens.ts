import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
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

/** Laravel MustVerifyEmail uses sha1(email) in the URL hash segment */
function laravelEmailHash(email: string): string {
  return createHash("sha1").update(email).digest("hex");
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

  for (const em of candidates) {
    if (safeEqualHex(emailVerificationHash(userId, em), hash)) return true;
    if (hash.length === 40 && safeEqualHex(laravelEmailHash(em), hash)) return true;
  }
  return false;
}

export function oauthStateToken(): string {
  return randomToken(16);
}
