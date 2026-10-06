import { NextRequest, NextResponse } from "next/server";
import { registerUser, resendVerificationEmail } from "@/server/services/auth.service";
import { attachSessionCookie, toSessionUser } from "@/lib/auth";
import { zodRegisterValidationMessage } from "@/lib/auth-errors";
import {
  clientIp,
  enforceRateLimits,
  RATE_LIMITS,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import { z } from "zod";
import { checkStoredPhone } from "@/lib/phone";
import { checkEmail } from "@/lib/email-check";

const schema = z.object({
  firstName: z.string().trim().min(1).max(255),
  lastName: z.string().trim().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8),
  phoneNumber: z.string().trim().min(1, "WhatsApp number is required"),
});

const BLOCKED_PUBLIC_ROLES = new Set(["agent", "builder", "admin", "staff"]);

export async function POST(request: NextRequest) {
  const { max, windowMs } = RATE_LIMITS.register;
  const registerLimit = enforceRateLimits([
    { key: `register:ip:${clientIp(request)}`, maxAttempts: max, windowMs },
  ]);
  if (!registerLimit.allowed) return rateLimitedResponse(registerLimit.retryAfterSec);

  const raw = await request.json();
  const requestedRole = String(raw.userType ?? raw.user_type ?? "")
    .trim()
    .toLowerCase();
  if (requestedRole && BLOCKED_PUBLIC_ROLES.has(requestedRole)) {
    return NextResponse.json(
      {
        success: false,
        message: "Agent and builder accounts must be created by an administrator.",
      },
      { status: 403 }
    );
  }

  const body = {
    firstName: raw.firstName ?? raw.first_name,
    lastName: raw.lastName ?? raw.last_name,
    email: raw.email,
    password: raw.password,
    phoneNumber: raw.phoneNumber ?? raw.phone_number,
  };
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: zodRegisterValidationMessage(parsed.error),
        errors: parsed.error.flatten(),
      },
      { status: 422 }
    );
  }

  // Same rules as the form: per-country phone validation (stored as international digits).
  const email = checkEmail(parsed.data.email);
  if (!email.ok) {
    return NextResponse.json({ success: false, message: email.message }, { status: 422 });
  }
  const phone = checkStoredPhone(parsed.data.phoneNumber);
  if (!phone.ok) {
    return NextResponse.json({ success: false, message: phone.message }, { status: 422 });
  }

  const result = await registerUser({ ...parsed.data, phoneNumber: phone.stored });
  if ("error" in result) {
    return NextResponse.json({ success: false, message: result.error }, { status: 422 });
  }

  await resendVerificationEmail(result.user.id).catch(() => undefined);

  const res = NextResponse.json({
    success: true,
    message: "Account created",
    user: toSessionUser(result.user),
    nextStep: "phone",
  });
  return attachSessionCookie(res, result.user);
}
