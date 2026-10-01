import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { updatePhoneForUser } from "@/server/services/auth.service";
import { attachSessionCookie } from "@/lib/auth";
import { z } from "zod";

/** Legacy: POST /user/phone_number — update phone for logged-in user */
export async function POST(request: NextRequest) {
  const session = await getSession();
  const body = await request.json();

  const userId = body.user_id != null ? Number(body.user_id) : session?.id;
  if (!userId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  if (session && session.id !== userId) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const phone =
    body.get_phone_number ?? body.phone ?? body.phone_number ?? null;
  const parsed = z
    .object({ phone: z.string().nullable() })
    .safeParse({ phone: phone != null ? String(phone) : null });
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid phone" }, { status: 422 });
  }

  const user = await updatePhoneForUser(userId, parsed.data.phone);
  if (!user) {
    return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
  }

  const res = NextResponse.json({
    success: true,
    data: user,
    message: "Success",
    response: "200",
  });
  if (session) return attachSessionCookie(res, user);
  return res;
}
