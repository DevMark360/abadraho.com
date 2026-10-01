import { authCookieOptions } from "@/lib/cookie-options";
import { parseSignedJsonCookieAsync } from "@/lib/signed-cookie-edge";
import type { AppRole } from "@/lib/roles";

/** Edge-safe user session cookie helpers (no Node crypto / Prisma). */

export const USER_COOKIE = "abadraho_session";

export interface SessionUser {
  id: number;
  email: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  userTypeId?: number | null;
  role?: AppRole;
  isPhoneNoVerified?: boolean;
  emailVerified?: boolean;
}

export async function parseSessionCookie(
  raw: string | undefined
): Promise<SessionUser | null> {
  const s = await parseSignedJsonCookieAsync<SessionUser>(raw);
  if (!s?.id) return null;
  return s;
}

export function sessionCookieOptions(maxAge = 60 * 60 * 24 * 7) {
  return authCookieOptions(maxAge);
}
