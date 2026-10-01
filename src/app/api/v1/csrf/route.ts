import { NextRequest, NextResponse } from "next/server";
import {
  createCsrfToken,
  CSRF_COOKIE,
  csrfCookieOptions,
  isValidCsrfToken,
} from "@/lib/csrf-edge";

/** Issue or refresh the CSRF double-submit cookie (readable by same-origin JS). */
export async function GET(request: NextRequest) {
  const existing = request.cookies.get(CSRF_COOKIE)?.value;
  const res = NextResponse.json({ success: true });
  if (await isValidCsrfToken(existing)) {
    return res;
  }
  const token = await createCsrfToken();
  res.cookies.set(CSRF_COOKIE, token, csrfCookieOptions());
  return res;
}
