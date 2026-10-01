import { NextResponse } from "next/server";
import type { SafeUser } from "@/server/services/auth.service";
import { roleFromUserTypeId } from "@/lib/roles";
import type { AppRole } from "@/lib/roles";
import { clearedCookieOptions } from "@/lib/cookie-options";
import { attachStaffAdminCookie, clearAdminSessionCookie } from "@/lib/staff-admin-cookie";
import {
  COOKIE,
  REDIRECT_COOKIE,
  serializeSessionCookie,
  sessionCookieOptions,
  redirectCookieOptions,
  type SessionUser,
} from "@/lib/session";

export function toSessionUser(user: SafeUser): SessionUser {
  const role = roleFromUserTypeId(user.userTypeId);
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    userTypeId: user.userTypeId,
    role,
    isPhoneNoVerified: user.isPhoneNoVerified,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}

export function attachSessionCookie(res: NextResponse, user: SafeUser): NextResponse {
  res.cookies.set(COOKIE, serializeSessionCookie(toSessionUser(user)), sessionCookieOptions());
  return attachStaffAdminCookie(res, user);
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(COOKIE, "", clearedCookieOptions(sessionCookieOptions()));
  return clearAdminSessionCookie(res);
}

export function jsonWithSession(user: SafeUser, extra?: Record<string, unknown>) {
  const res = NextResponse.json({
    success: true,
    user: toSessionUser(user),
    ...extra,
  });
  return attachSessionCookie(res, user);
}

export function requireRole(session: SessionUser | null, roles: AppRole[]): boolean {
  if (!session?.role) return false;
  return roles.includes(session.role);
}

export { COOKIE, REDIRECT_COOKIE, sessionCookieOptions, redirectCookieOptions };
