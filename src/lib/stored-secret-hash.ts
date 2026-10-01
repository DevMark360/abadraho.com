import { createHmac, timingSafeEqual } from "crypto";
import { getAuthSecret } from "@/lib/auth-secret";

const HASH_PREFIX = "v1:";

/** One-way hash for OTPs and reset tokens stored in the database. */
export function hashStoredSecret(value: string): string {
  const digest = createHmac("sha256", getAuthSecret()).update(value).digest("hex");
  return `${HASH_PREFIX}${digest}`;
}

export function isHashedStoredSecret(stored: string): boolean {
  return stored.startsWith(HASH_PREFIX);
}

/** Constant-time verify; accepts legacy plaintext values during migration. */
export function verifyStoredSecret(value: string, stored: string | null | undefined): boolean {
  if (!stored) return false;

  const plain = value.trim();
  if (isHashedStoredSecret(stored)) {
    const expected = hashStoredSecret(plain);
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(stored));
    } catch {
      return false;
    }
  }

  try {
    return timingSafeEqual(Buffer.from(plain), Buffer.from(stored));
  } catch {
    return plain === stored;
  }
}
