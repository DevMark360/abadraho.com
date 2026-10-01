import { oauthStateToken } from "@/lib/tokens";
import { siteConfig } from "@/config/site";

const OAUTH_STATE_COOKIE = "abadraho_oauth_state";
const LOGIN_REDIRECT_COOKIE = "abadraho_login_redirect";
const OAUTH_REDIRECT_URI_COOKIE = "abadraho_oauth_redirect_uri";

export { OAUTH_STATE_COOKIE, LOGIN_REDIRECT_COOKIE, OAUTH_REDIRECT_URI_COOKIE };

function appUrl(): string {
  return process.env.AUTH_URL ?? siteConfig.url;
}

/** Same paths as Laravel config/services.php (dev.abadraho.com) */
export function oauthCallbackPath(provider: "google" | "facebook"): string {
  if (provider === "google") {
    return (
      process.env.OAUTH_GOOGLE_CALLBACK_PATH ??
      process.env.GOOGLE_REDIRECT_PATH ??
      "/auth/google/call-back"
    );
  }
  return (
    process.env.OAUTH_FACEBOOK_CALLBACK_PATH ??
    process.env.FACEBOOK_REDIRECT_PATH ??
    "/auth/facebook/call-back"
  );
}

export function oauthRedirectUri(
  provider: "google" | "facebook",
  origin?: string
): string {
  const base = (origin ?? appUrl()).replace(/\/$/, "");
  const path = oauthCallbackPath(provider);
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Use the browser origin so redirect_uri matches the site the user is on. */
export function oauthRedirectUriFromRequest(
  provider: "google" | "facebook",
  requestOrigin: string
): string {
  return oauthRedirectUri(provider, requestOrigin);
}

export function googleAuthUrl(state: string, redirectUri: string): string | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export function facebookAuthUrl(state: string, redirectUri: string): string | null {
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  if (!clientId) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: "email,public_profile",
  });
  return `https://www.facebook.com/v18.0/dialog/oauth?${params}`;
}

export async function exchangeGoogleCode(
  code: string,
  redirectUri: string
): Promise<{
  id: string;
  email: string;
  name: string;
  picture?: string;
} | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text().catch(() => "");
    console.error("[oauth:google:token]", tokenRes.status, err.slice(0, 300));
    return null;
  }
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) return null;

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileRes.ok) return null;
  const p = (await profileRes.json()) as {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
  return { id: p.id, email: p.email, name: p.name, picture: p.picture };
}

export async function exchangeFacebookCode(
  code: string,
  redirectUri: string
): Promise<{
  id: string;
  email: string;
  name: string;
  picture?: string;
} | null> {
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const tokenUrl = new URL("https://graph.facebook.com/v18.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);
  tokenUrl.searchParams.set("redirect_uri", redirectUri);
  tokenUrl.searchParams.set("code", code);

  const tokenRes = await fetch(tokenUrl, { signal: AbortSignal.timeout(20_000) });
  if (!tokenRes.ok) {
    const err = await tokenRes.text().catch(() => "");
    console.error("[oauth:facebook:token]", tokenRes.status, err.slice(0, 300));
    return null;
  }
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) return null;

  const profileUrl = new URL("https://graph.facebook.com/me");
  profileUrl.searchParams.set("fields", "id,name,email,picture");
  profileUrl.searchParams.set("access_token", tokens.access_token);

  const profileRes = await fetch(profileUrl);
  if (!profileRes.ok) return null;
  const p = (await profileRes.json()) as {
    id: string;
    email?: string;
    name: string;
    picture?: { data?: { url?: string } };
  };
  return {
    id: p.id,
    email: p.email ?? `${p.id}@facebook.local`,
    name: p.name,
    picture: p.picture?.data?.url,
  };
}

export function newOAuthState(): string {
  return oauthStateToken();
}
