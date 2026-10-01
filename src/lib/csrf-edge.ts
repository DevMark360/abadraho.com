import type { NextRequest, NextResponse } from "next/server";
import {
  signCookieValueAsync,
  verifyCookieValueAsync,
} from "@/lib/signed-cookie-edge";

export const CSRF_COOKIE = "abadraho_csrf";
export const CSRF_HEADER = "x-csrf-token";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function csrfCookieOptions() {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24,
    path: "/",
  };
}

export async function createCsrfToken(): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  const token = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return signCookieValueAsync(token);
}

export async function isValidCsrfToken(signed: string | undefined): Promise<boolean> {
  if (!signed) return false;
  const payload = await verifyCookieValueAsync(signed);
  return Boolean(payload && payload.length >= 16);
}

/** Double-submit: signed cookie must match header and verify. */
export async function validateCsrfRequest(request: NextRequest): Promise<boolean> {
  const cookieVal = request.cookies.get(CSRF_COOKIE)?.value;
  const headerVal = request.headers.get(CSRF_HEADER);
  if (!cookieVal || !headerVal) return false;
  if (!timingSafeEqualString(cookieVal, headerVal)) return false;
  return isValidCsrfToken(cookieVal);
}

/** JazzCash posts here directly (browser redirect / server callback) — it can't carry our CSRF cookie/token. Its own integrity check is the pp_SecureHash HMAC verification instead (see advertising-payment-jazzcash.service.ts). */
export function isCsrfExemptPath(pathname: string): boolean {
  return pathname === "/api/v1/csrf" || pathname === "/api/v1/advertising/wallet/jazzcash/callback";
}

const LEGACY_ADMIN_IMPORT_PATHS = new Set([
  "/import-areas",
  "/import-units",
  "/import-types",
]);

export function requiresCsrfValidation(method: string, pathname: string): boolean {
  if (!MUTATING_METHODS.has(method.toUpperCase())) return false;
  if (pathname.startsWith("/api/")) return !isCsrfExemptPath(pathname);
  return LEGACY_ADMIN_IMPORT_PATHS.has(pathname);
}

export async function ensureCsrfCookie(
  request: NextRequest,
  response: NextResponse
): Promise<void> {
  const existing = request.cookies.get(CSRF_COOKIE)?.value;
  if (await isValidCsrfToken(existing)) return;
  const token = await createCsrfToken();
  response.cookies.set(CSRF_COOKIE, token, csrfCookieOptions());
}

/** Legacy Laravel rewrite targets → equivalent /api/admin/import/* path for RBAC. */
export function legacyImportApiPath(pathname: string): string | null {
  const map: Record<string, string> = {
    "/import-areas": "/api/admin/import/areas",
    "/import-units": "/api/admin/import/units",
    "/import-types": "/api/admin/import/types",
  };
  return map[pathname] ?? null;
}
