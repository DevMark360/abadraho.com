import { NextRequest, NextResponse } from "next/server";
import {
  googleAuthUrl,
  newOAuthState,
  OAUTH_REDIRECT_URI_COOKIE,
  OAUTH_STATE_COOKIE,
  oauthRedirectUriFromRequest,
} from "@/lib/oauth";
import { sessionCookieOptions } from "@/lib/session";

export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref");
  const state = newOAuthState();
  const redirectUri = oauthRedirectUriFromRequest("google", request.nextUrl.origin);
  const url = googleAuthUrl(state, redirectUri);
  if (!url) {
    return NextResponse.json(
      { success: false, message: "Google OAuth not configured (GOOGLE_CLIENT_ID)" },
      { status: 503 }
    );
  }

  const res = NextResponse.redirect(url);
  const cookieOpts = { ...sessionCookieOptions(600), maxAge: 600 };
  res.cookies.set(OAUTH_STATE_COOKIE, state, cookieOpts);
  res.cookies.set(OAUTH_REDIRECT_URI_COOKIE, redirectUri, cookieOpts);
  if (ref?.startsWith("/")) {
    res.cookies.set("abadraho_login_redirect", ref, { ...sessionCookieOptions(3600), maxAge: 3600 });
  }
  return res;
}
