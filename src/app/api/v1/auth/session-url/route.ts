import { NextRequest, NextResponse } from "next/server";
import { REDIRECT_COOKIE, redirectCookieOptions } from "@/lib/session";
import { z } from "zod";
import { isSafeRelativePath } from "@/lib/post-login-redirect";

/** Legacy: POST /requested-session-url — store post-login redirect */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = z
    .object({ url: z.string().min(1) })
    .safeParse({ url: body.url ?? body.ref });
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "url required" }, { status: 422 });
  }

  const url = parsed.data.url;
  if (!isSafeRelativePath(url)) {
    return NextResponse.json({ success: false, message: "Invalid redirect URL" }, { status: 422 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(REDIRECT_COOKIE, url, redirectCookieOptions());
  return res;
}
