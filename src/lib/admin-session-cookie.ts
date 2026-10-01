import { authCookieOptions } from "@/lib/cookie-options";
import { parseSignedJsonCookieAsync } from "@/lib/signed-cookie-edge";

/** Edge-safe admin session cookie helpers (no Prisma / Node crypto). */

export const ADMIN_COOKIE = "abadraho_admin_session";

export interface AdminSession {
  id: number;
  email: string;
  name: string | null;
  /** Set when logged in via `users` table (staff / builder) */
  userTypeId?: number | null;
  /** `admins` table vs `users` table */
  source?: "admin" | "user";
  /** Custom staff role from `staff_roles` */
  staffRoleId?: number | null;
  /** Role flagged as full access */
  isSuperAdminRole?: boolean;
}

export async function parseAdminSessionCookie(
  raw: string | undefined
): Promise<AdminSession | null> {
  const s = await parseSignedJsonCookieAsync<AdminSession>(raw);
  if (!s?.id || !s?.email) return null;
  return s;
}

export function adminSessionCookieOptions(maxAge = 60 * 60 * 24) {
  return authCookieOptions(maxAge);
}
