import { NextRequest, NextResponse } from "next/server";
import {
  resendPhoneOtp,
  submitPhoneNumber,
  verifyPhoneOtp,
} from "@/server/services/auth.service";
import { getSession } from "@/lib/session";
import { attachSessionCookie } from "@/lib/auth";
import { z } from "zod";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Sign in required" }, { status: 401 });
  }

  const body = await request.json();
  const action = body.action as string;

  if (action === "submit-phone") {
    const parsed = z.object({ phoneNumber: z.string().min(10) }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "Valid phone required" }, { status: 422 });
    }
    const result = await submitPhoneNumber(session.id, parsed.data.phoneNumber);
    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  }

  if (action === "verify") {
    const parsed = z.object({ otp: z.string().length(4) }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "4-digit OTP required" }, { status: 422 });
    }
    const result = await verifyPhoneOtp(session.id, parsed.data.otp);
    if (result.success && result.user) {
      const res = NextResponse.json(result);
      return attachSessionCookie(res, result.user);
    }
    return NextResponse.json(result, { status: 422 });
  }

  if (action === "resend") {
    const result = await resendPhoneOtp(session.id);
    return NextResponse.json(result, { status: result.success ? 200 : 429 });
  }

  return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
}
