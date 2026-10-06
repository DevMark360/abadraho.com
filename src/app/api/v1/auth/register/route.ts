import { NextRequest, NextResponse } from "next/server";
import {
  changeSignupPhone,
  resendSignupCode,
  resendVerificationEmail,
  startSignup,
  verifySignupCode,
} from "@/server/services/auth.service";
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
import { passwordProblem } from "@/lib/password-policy";

/**
 * Signup = 2 steps; no account exists until the WhatsApp code is verified.
 *   { action: "start", firstName, lastName, email, password, phoneNumber } → { token }
 *   { action: "verify", token, otp }          → account created + session cookie
 *   { action: "resend", token }               → new code
 *   { action: "change-phone", token, phoneNumber } → new number + new code
 */
const schema = z.object({
  firstName: z.string().trim().min(1).max(255),
  lastName: z.string().trim().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8),
  phoneNumber: z.string().trim().min(1, "WhatsApp number is required"),
});

const BLOCKED_PUBLIC_ROLES = new Set(["agent", "builder", "admin", "staff"]);

function fail(message: string, status = 422) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(request: NextRequest) {
  const raw = await request.json();
  const action = String(raw.action ?? "start");
  const token = String(raw.token ?? "");

  if (action === "verify") {
    const otp = String(raw.otp ?? "").replace(/\D/g, "");
    if (otp.length !== 4) return fail("Enter the 4-digit code.");
    const result = await verifySignupCode(token, otp);
    if (!result.success || !result.user) return fail(result.message);
    await resendVerificationEmail(result.user.id).catch(() => undefined);
    const res = NextResponse.json({
      success: true,
      message: "Account created",
      user: toSessionUser(result.user),
    });
    return attachSessionCookie(res, result.user);
  }

  if (action === "resend") {
    const result = await resendSignupCode(token);
    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  }

  if (action === "change-phone") {
    const result = await changeSignupPhone(token, String(raw.phoneNumber ?? raw.phone_number ?? ""));
    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  }

  // action === "start"
  const { max, windowMs } = RATE_LIMITS.register;
  const registerLimit = enforceRateLimits([
    { key: `register:ip:${clientIp(request)}`, maxAttempts: max, windowMs },
  ]);
  if (!registerLimit.allowed) return rateLimitedResponse(registerLimit.retryAfterSec);

  const requestedRole = String(raw.userType ?? raw.user_type ?? "")
    .trim()
    .toLowerCase();
  if (requestedRole && BLOCKED_PUBLIC_ROLES.has(requestedRole)) {
    return fail("Agent and builder accounts must be created by an administrator.", 403);
  }

  const parsed = schema.safeParse({
    firstName: raw.firstName ?? raw.first_name,
    lastName: raw.lastName ?? raw.last_name,
    email: raw.email,
    password: raw.password,
    phoneNumber: raw.phoneNumber ?? raw.phone_number,
  });
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

  // Same rules as the form: email format, password strength, per-country phone.
  const email = checkEmail(parsed.data.email);
  if (!email.ok) return fail(email.message);
  const weak = passwordProblem(parsed.data.password);
  if (weak) return fail(weak);
  const phone = checkStoredPhone(parsed.data.phoneNumber);
  if (!phone.ok) return fail(phone.message);

  const result = await startSignup({ ...parsed.data, phone: phone.stored });
  return NextResponse.json(result, { status: result.success ? 200 : 422 });
}
