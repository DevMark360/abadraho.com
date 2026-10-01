import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

function safeEqualString(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export function isHealthCheckRestricted(): boolean {
  return process.env.NODE_ENV === "production";
}

export function getHealthCheckSecret(): string | undefined {
  const secret = process.env.HEALTH_CHECK_SECRET?.trim();
  return secret || undefined;
}

/** Token from Authorization: Bearer, x-health-token header, or ?secret= query. */
export function readHealthCheckToken(request: Request): string | undefined {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }

  const header = request.headers.get("x-health-token")?.trim();
  if (header) return header;

  try {
    const secret = new URL(request.url).searchParams.get("secret")?.trim();
    if (secret) return secret;
  } catch {
    /* ignore */
  }

  return undefined;
}

export function isHealthCheckAuthorized(request: Request): boolean {
  if (!isHealthCheckRestricted()) return true;

  const expected = getHealthCheckSecret();
  if (!expected) return false;

  const provided = readHealthCheckToken(request);
  if (!provided) return false;

  return safeEqualString(provided, expected);
}

export function healthCheckDeniedResponse(): NextResponse {
  if (!isHealthCheckRestricted()) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  if (!getHealthCheckSecret()) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
}
