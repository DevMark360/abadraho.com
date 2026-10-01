import { NextRequest, NextResponse } from "next/server";
import {
  clientIp,
  enforceRateLimits,
  RATE_LIMITS,
  rateLimitedResponse,
} from "@/lib/rate-limit";
import { userExists } from "@/server/services/auth.service";

/** Legacy: POST /api/user-exists */
export async function POST(request: NextRequest) {
  const { max, windowMs } = RATE_LIMITS.userExists;
  const limit = enforceRateLimits([
    { key: `user-exists:ip:${clientIp(request)}`, maxAttempts: max, windowMs },
  ]);
  if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSec);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const id = Number(body.id ?? body.user_id);
  if (!id) {
    return NextResponse.json({ success: false, message: "id required" }, { status: 422 });
  }

  const exists = await userExists(id);
  return NextResponse.json({
    success: true,
    data: exists ? { id } : null,
    response: exists ? "200" : "404",
    message: "Success",
  });
}
