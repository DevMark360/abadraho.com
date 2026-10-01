import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getAdminSession } from "@/lib/admin-session";
import {
  changePassword,
  requestPasswordReset,
  resetPasswordWithToken,
} from "@/server/services/auth.service";
import {
  normalizeAuthEmail,
  passwordResetEmailMismatchMessage,
  zodPasswordChangeValidationMessage,
} from "@/lib/auth-errors";import {
  clientIp,
  enforceRateLimits,
  RATE_LIMITS,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import { z } from "zod";

async function authenticatedAccountEmail(): Promise<string | null> {
  const session = await getSession();
  const fromUser = normalizeAuthEmail(session?.email);
  if (fromUser) return fromUser;
  const adminSession = await getAdminSession();
  return normalizeAuthEmail(adminSession?.email);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const action = body.action as string;
  const ip = clientIp(request);

  if (action === "reset-request") {
    const parsed = z.object({ email: z.string().email() }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Enter a valid email address." },
        { status: 422 }
      );
    }
    const email = parsed.data.email.trim().toLowerCase();
    const authenticatedEmail = await authenticatedAccountEmail();
    if (authenticatedEmail && email !== authenticatedEmail) {
      return NextResponse.json(
        { success: false, message: passwordResetEmailMismatchMessage() },
        { status: 403 }
      );
    }

    const { max, windowMs } = RATE_LIMITS.passwordResetRequest;
    const limit = enforceRateLimits([
      { key: `password-reset:ip:${ip}`, maxAttempts: max, windowMs },
      { key: `password-reset:email:${email}`, maxAttempts: max, windowMs },
    ]);
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSec);

    const result = await requestPasswordReset(email, { authenticatedEmail });
    return NextResponse.json(result);
  }

  if (action === "reset") {
    const { max, windowMs } = RATE_LIMITS.passwordResetToken;
    const limit = enforceRateLimits([
      { key: `password-reset-token:ip:${ip}`, maxAttempts: max, windowMs },
    ]);
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSec);

    const parsed = z
      .object({
        token: z.string().min(10),
        password: z.string().min(8),
        password_confirmation: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: zodPasswordChangeValidationMessage(parsed.error) },
        { status: 422 }
      );
    }
    if (
      parsed.data.password_confirmation != null &&
      parsed.data.password !== parsed.data.password_confirmation
    ) {
      return NextResponse.json({ success: false, message: "Passwords do not match" }, { status: 422 });
    }
    const result = await resetPasswordWithToken(parsed.data.token, parsed.data.password);
    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  }

  if (action === "change") {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const parsed = z
      .object({
        currentPassword: z.string().min(1),
        password: z.string().min(8),
        password_confirmation: z.string().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: zodPasswordChangeValidationMessage(parsed.error) },
        { status: 422 }
      );
    }
    if (
      parsed.data.password_confirmation != null &&
      parsed.data.password !== parsed.data.password_confirmation
    ) {
      return NextResponse.json({ success: false, message: "Passwords do not match" }, { status: 422 });
    }
    const result = await changePassword(
      session.id,
      parsed.data.currentPassword,
      parsed.data.password
    );
    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  }

  return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
}
