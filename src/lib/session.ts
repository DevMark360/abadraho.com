import { cookies } from "next/headers";
import {
  parseSessionCookie,
  sessionCookieOptions,
  USER_COOKIE,
  type SessionUser,
} from "@/lib/session-cookie";
import { signJsonCookie } from "@/lib/signed-cookie";

const REDIRECT_COOKIE = "abadraho_login_redirect";

/** @deprecated Use USER_COOKIE */
export const COOKIE = USER_COOKIE;

export { USER_COOKIE, parseSessionCookie, sessionCookieOptions, type SessionUser };

export function serializeSessionCookie(user: SessionUser): string {
  return signJsonCookie(user);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  return parseSessionCookie(jar.get(USER_COOKIE)?.value);
}

export function redirectCookieOptions(maxAge = 60 * 60) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  };
}

export async function getLoginRedirect(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(REDIRECT_COOKIE)?.value ?? null;
}

export { REDIRECT_COOKIE };
