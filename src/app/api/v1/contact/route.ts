import { NextRequest, NextResponse } from "next/server";
import { parseContactForm } from "@/lib/contact-form";
import { createContactInquiry } from "@/server/services/public-forms.service";
import {
  clientIp,
  enforceRateLimits,
  RATE_LIMITS,
  rateLimitedResponse,
} from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseContactForm(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: parsed.message }, { status: 422 });
  }

  const { max, windowMs } = RATE_LIMITS.contact;
  const contactLimit = enforceRateLimits([
    { key: `contact:ip:${clientIp(request)}`, maxAttempts: max, windowMs },
    { key: `contact:email:${parsed.data.email}`, maxAttempts: max, windowMs },
  ]);
  if (!contactLimit.allowed) return rateLimitedResponse(contactLimit.retryAfterSec);

  const result = await createContactInquiry(body);

  if (!result.success) {
    return NextResponse.json(result, { status: 422 });
  }
  return NextResponse.json({
    success: true,
    message: result.message,
  });
}
