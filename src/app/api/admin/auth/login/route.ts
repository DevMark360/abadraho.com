import { NextRequest, NextResponse } from "next/server";
import { authenticateAdminAttempt } from "@/server/services/admin-auth.service";
import {
  ADMIN_COOKIE,
  adminSessionCookieOptions,
  serializeAdminSessionCookie,
} from "@/lib/admin-session";
import { isDatabaseEnabled } from "@/lib/db";
import { resolveAdminLoginFailure, zodLoginValidationMessage } from "@/lib/auth-errors";
import {
  clientIp,
  enforceRateLimits,
  RATE_LIMITS,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import {
  logLoginFailed,
  logLoginRateLimited,
  logLoginSuccess,
} from "@/lib/security-log";
import { z } from "zod";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = z
    .object({
      email: z.string().email(),
      password: z.string().min(1),
    })
    .safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: zodLoginValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;
  const { max, windowMs } = RATE_LIMITS.login;
  const limit = enforceRateLimits([
    { key: `admin-login:ip:${clientIp(request)}`, maxAttempts: max, windowMs },
    { key: `admin-login:email:${normalizedEmail}`, maxAttempts: max, windowMs },
  ]);
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSec);

  if (!isDatabaseEnabled()) {
    return NextResponse.json(
      {
        success: false,
        message: "Enable USE_DATABASE=true and connect MySQL to use admin login",
      },
      { status: 503 }
    );
  }

  const attempt = await authenticateAdminAttempt(normalizedEmail, password);
  if (!attempt.ok) {
    const failure = resolveAdminLoginFailure(attempt);
    logLoginFailed(request, {
      channel: "admin",
      email: normalizedEmail,
      reason: failure.reason,
    });
    return NextResponse.json({ success: false, message: failure.message }, { status: 401 });
  }

  const admin = attempt.value;

  logLoginSuccess(request, {
    channel: "admin",
    actor: {
      id: admin.id,
      email: admin.email,
      source: admin.source,
      role: admin.source === "admin" ? "fullStaff" : "user",
    },
  });

  const res = NextResponse.json({ success: true, admin });
  res.cookies.set(ADMIN_COOKIE, serializeAdminSessionCookie(admin), adminSessionCookieOptions());
  return res;
}
