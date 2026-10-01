const STORAGE_KEY = "abadraho_last_login_email";

export function rememberLoginEmail(email: string): void {
  const normalized = email.trim().toLowerCase();
  if (!normalized || typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    /* private browsing */
  }
}

export function recallLoginEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
