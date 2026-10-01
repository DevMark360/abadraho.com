import { createHmac, timingSafeEqual } from "crypto";
import { getAuthSecret } from "@/lib/auth-secret";

/** HMAC-SHA256 signed cookie value: `base64url(payload).base64url(sig)` */
export function signCookieValue(payload: string): string {
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  const sig = createHmac("sha256", getAuthSecret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifyCookieValue(signed: string): string | null {
  const dot = signed.lastIndexOf(".");
  if (dot <= 0) return null;

  const encoded = signed.slice(0, dot);
  const sig = signed.slice(dot + 1);
  if (!encoded || !sig) return null;

  const expected = createHmac("sha256", getAuthSecret()).update(encoded).digest("base64url");

  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    return Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function signJsonCookie<T>(data: T): string {
  return signCookieValue(JSON.stringify(data));
}

export function parseSignedJsonCookie<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  const json = verifyCookieValue(raw);
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
