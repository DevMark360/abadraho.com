import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie } from "@/lib/auth";
import { getPostLoginRedirect } from "@/lib/post-login-redirect";
import { roleFromUserTypeId } from "@/lib/roles";
import { OAUTH_STATE_COOKIE } from "@/lib/oauth";
import { findOrCreateOAuthUser } from "@/server/services/auth.service";

function oauthAppBase(request: NextRequest): string {
  return request.nextUrl.origin.replace(/\/$/, "");
}

export async function handleOAuthCallback(
  request: NextRequest,
  profile: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  } | null,
  provider: "GOOGLE" | "FACEBOOK",
  errorCode: string
): Promise<NextResponse> {
  const base = oauthAppBase(request);

  if (!profile) {
    return NextResponse.redirect(`${base}/login?error=${errorCode}`);
  }

  try {
    const user = await findOrCreateOAuthUser({
      provider,
      recordId: profile.id,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    });

    const ref = request.cookies.get("abadraho_login_redirect")?.value;
    const role = roleFromUserTypeId(user.userTypeId);
    const dest = getPostLoginRedirect(user.userTypeId, role, ref);

    const res = NextResponse.redirect(`${base}${dest}`);
    res.cookies.delete(OAUTH_STATE_COOKIE);
    res.cookies.delete("abadraho_login_redirect");
    return attachSessionCookie(res, user);
  } catch (e) {
    console.error(`[oauth:${provider.toLowerCase()}]`, e);
    return NextResponse.redirect(`${base}/login?error=oauth_failed`);
  }
}

export function validateOAuthState(request: NextRequest): boolean {
  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  return Boolean(state && cookieState && state === cookieState);
}
