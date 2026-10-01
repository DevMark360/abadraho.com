import type { NextResponse } from "next/server";
import type { SafeUser } from "@/server/services/auth.service";
import { clearedCookieOptions } from "@/lib/cookie-options";
import { userTypeIds } from "@/config/site";
import {
  ADMIN_COOKIE,
  adminSessionCookieOptions,
  serializeAdminSessionCookie,
  type AdminSession,
} from "@/lib/admin-session";

export function adminSessionFromStaffUser(user: SafeUser): AdminSession | null {
  const typeId = user.userTypeId;
  if (
    typeId !== userTypeIds.superAdmin &&
    typeId !== userTypeIds.admin &&
    typeId !== userTypeIds.builder
  ) {
    return null;
  }
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return {
    id: user.id,
    email: user.email ?? "",
    name: name || null,
    source: "user",
    userTypeId: typeId,
  };
}

export function attachStaffAdminCookie(res: NextResponse, user: SafeUser): NextResponse {
  const admin = adminSessionFromStaffUser(user);
  if (admin) {
    res.cookies.set(ADMIN_COOKIE, serializeAdminSessionCookie(admin), adminSessionCookieOptions());
  } else {
    clearAdminSessionCookie(res);
  }
  return res;
}

export function clearAdminSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(ADMIN_COOKIE, "", clearedCookieOptions(adminSessionCookieOptions()));
  return res;
}
