const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  oauth_state: "Sign-in expired or invalid. Please try again.",
  oauth_google:
    "Google sign-in failed. Add this site's callback URL in Google Cloud Console → Credentials → Authorized redirect URIs (e.g. https://dev.abadraho.com/auth/google/call-back).",
  oauth_facebook: "Facebook sign-in failed. Check FACEBOOK_APP settings and callback URL.",
  oauth_denied: "Sign-in was cancelled.",
  oauth_failed: "Could not complete sign-in. Please try again.",
};

export function oauthErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  return OAUTH_ERROR_MESSAGES[code] ?? "Sign-in failed. Please try again.";
}
