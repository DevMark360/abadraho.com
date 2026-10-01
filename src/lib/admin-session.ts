import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  adminSessionCookieOptions,
  parseAdminSessionCookie,
  type AdminSession,
} from "@/lib/admin-session-cookie";
import { signJsonCookie } from "@/lib/signed-cookie";
import { revalidateAdminSession } from "@/lib/verify-admin-session";

export {
  ADMIN_COOKIE,
  adminSessionCookieOptions,
  parseAdminSessionCookie,
  type AdminSession,
};

export function serializeAdminSessionCookie(session: AdminSession): string {
  return signJsonCookie(session);
}

/** Parse cookie, verify HMAC, then revalidate id/email/role against the database. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  const parsed = await parseAdminSessionCookie(jar.get(ADMIN_COOKIE)?.value);
  if (!parsed) return null;
  return revalidateAdminSession(parsed);
}
