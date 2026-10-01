import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode, OAUTH_REDIRECT_URI_COOKIE, oauthRedirectUri } from "@/lib/oauth";
import { handleOAuthCallback, validateOAuthState } from "@/lib/oauth-callback";
export async function GET(request: NextRequest) {
  const base = request.nextUrl.origin.replace(/\/$/, "");

  if (request.nextUrl.searchParams.get("error")) {
    return NextResponse.redirect(`${base}/login?error=oauth_denied`);
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code || !validateOAuthState(request)) {
    return NextResponse.redirect(`${base}/login?error=oauth_state`);
  }

  const redirectUri =
    request.cookies.get(OAUTH_REDIRECT_URI_COOKIE)?.value ?? oauthRedirectUri("google");
  const profile = await exchangeGoogleCode(code, redirectUri);
  const res = await handleOAuthCallback(request, profile, "GOOGLE", "oauth_google");
  res.cookies.delete(OAUTH_REDIRECT_URI_COOKIE);
  return res;
}
