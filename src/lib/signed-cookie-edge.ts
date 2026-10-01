import { getAuthSecret } from "@/lib/auth-secret";

/** Web Crypto HMAC verify — safe for Edge Middleware and Node.js. */

const textEncoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array | null {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function base64UrlToUtf8(value: string): string | null {
  const bytes = base64UrlToBytes(value);
  if (!bytes) return null;
  return new TextDecoder().decode(bytes);
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

async function hmacSha256Base64Url(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, textEncoder.encode(message));
  return bytesToBase64Url(new Uint8Array(sig));
}

export async function signCookieValueAsync(payload: string): Promise<string> {
  const encoded = bytesToBase64Url(textEncoder.encode(payload));
  const sig = await hmacSha256Base64Url(encoded, getAuthSecret());
  return `${encoded}.${sig}`;
}

export async function verifyCookieValueAsync(signed: string): Promise<string | null> {
  const dot = signed.lastIndexOf(".");
  if (dot <= 0) return null;

  const encoded = signed.slice(0, dot);
  const sig = signed.slice(dot + 1);
  if (!encoded || !sig) return null;

  const expected = await hmacSha256Base64Url(encoded, getAuthSecret());
  if (!timingSafeEqualBytes(textEncoder.encode(sig), textEncoder.encode(expected))) {
    return null;
  }

  return base64UrlToUtf8(encoded);
}

export async function parseSignedJsonCookieAsync<T>(raw: string | undefined): Promise<T | null> {
  if (!raw) return null;
  const json = await verifyCookieValueAsync(raw);
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
