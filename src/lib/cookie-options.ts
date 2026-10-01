/** Shared flags for auth and guest tracking cookies. */

export function authCookieOptions(maxAge: number) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/** Use when clearing a cookie so browsers drop it reliably (logout). */
export function clearedCookieOptions(
  options: ReturnType<typeof authCookieOptions>
) {
  return {
    ...options,
    maxAge: 0,
    expires: new Date(0),
  };
}
