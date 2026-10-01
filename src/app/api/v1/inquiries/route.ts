import { NextRequest, NextResponse } from "next/server";
import { honeypotFromBody, rateLimitUserMessage } from "@/lib/form-spam";
import {
  clientIp,
  enforceRateLimits,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { getSession } from "@/lib/session";
import { createPropertyInquiry } from "@/server/services/public-forms.service";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
  }

  if (honeypotFromBody(body)) {
    return NextResponse.json({
      success: true,
      message: "Inquiry submitted. We will contact you soon.",
    });
  }

  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  const ip = clientIp(request);
  const { max, windowMs } = RATE_LIMITS.inquiry;
  const limit = enforceRateLimits([
    { key: `inquiry:ip:${ip}`, maxAttempts: max, windowMs },
    ...(email ? [{ key: `inquiry:email:${email}`, maxAttempts: max, windowMs }] : []),
  ]);

  if (!limit.allowed) {
    return NextResponse.json(
      { success: false, message: rateLimitUserMessage(limit.retryAfterSec) },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSec ?? 60) },
      }
    );
  }

  const session = await getSession();
  const result = await createPropertyInquiry(body, session);

  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
