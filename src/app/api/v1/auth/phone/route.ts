import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updatePhoneForUser } from "@/server/services/auth.service";
import { attachSessionCookie } from "@/lib/auth";
import { z } from "zod";

/**
 * Legacy: POST /user/phone_number — update phone for the signed-in user.
 * Always the session's own account: the legacy `user_id` body field used to let anonymous
 * callers rewrite any user's phone (and read back their email), so it is ignored.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
  }

  const phone = body.get_phone_number ?? body.phone ?? body.phone_number ?? null;
  const parsed = z
    .object({ phone: z.string().nullable() })
    .safeParse({ phone: phone != null ? String(phone) : null });
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid phone" }, { status: 422 });
  }

  const user = await updatePhoneForUser(session.id, parsed.data.phone);
  if (!user) {
    return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
  }

  const res = NextResponse.json({
    success: true,
    data: user,
    message: "Success",
    response: "200",
  });
  return attachSessionCookie(res, user);
}
