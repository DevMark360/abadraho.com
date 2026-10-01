import { NextRequest, NextResponse } from "next/server";
import { authenticateUserAttempt } from "@/server/services/auth.service";
import { authenticateAdminAttempt } from "@/server/services/admin-auth.service";
import { attachSessionCookie, toSessionUser } from "@/lib/auth";
import { resolveBuilderIdForUser } from "@/lib/admin-builder-ownership";
import { userTypeIds } from "@/config/site";
import { resolvePublicLoginFailure, zodLoginValidationMessage } from "@/lib/auth-errors";
import {
  ADMIN_COOKIE,
  adminSessionCookieOptions,
  serializeAdminSessionCookie,
} from "@/lib/admin-session";
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

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: zodLoginValidationMessage(parsed.error) },
      { status: 400 }
    );
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const { max, windowMs } = RATE_LIMITS.login;
  const limit = enforceRateLimits([
    { key: `login:ip:${clientIp(request)}`, maxAttempts: max, windowMs },
    { key: `login:email:${normalizedEmail}`, maxAttempts: max, windowMs },
  ]);
  if (!limit.allowed) {
    logLoginRateLimited(request, { channel: "public", email: normalizedEmail });
    return rateLimitedResponse(limit.retryAfterSec);
  }

  const userAttempt = await authenticateUserAttempt(normalizedEmail, parsed.data.password);
  if (userAttempt.ok) {
    const user = userAttempt.value;
    if (user.userTypeId === userTypeIds.builder) {
      await resolveBuilderIdForUser(user.id);
    }
    logLoginSuccess(request, {
      channel: "public",
      actor: { id: user.id, email: user.email ?? normalizedEmail, role: "user" },
    });
    const res = NextResponse.json({ success: true, kind: "user", user: toSessionUser(user) });
    return attachSessionCookie(res, user);
  }

  const adminAttempt = await authenticateAdminAttempt(normalizedEmail, parsed.data.password);
  if (adminAttempt.ok) {
    const admin = adminAttempt.value;
    logLoginSuccess(request, {
      channel: "admin",
      actor: {
        id: admin.id,
        email: admin.email,
        source: admin.source,
        role: admin.source === "admin" ? "fullStaff" : "user",
      },
    });
    const res = NextResponse.json({
      success: true,
      kind: "admin",
      redirect: "/admin/dashboard",
    });
    res.cookies.set(ADMIN_COOKIE, serializeAdminSessionCookie(admin), adminSessionCookieOptions());
    return res;
  }

  const failure = resolvePublicLoginFailure(userAttempt, adminAttempt);
  logLoginFailed(request, {
    channel: "public",
    email: normalizedEmail,
    reason: failure.reason,
  });

  return NextResponse.json(
    { success: false, message: failure.message },
    { status: 401 }
  );
}
