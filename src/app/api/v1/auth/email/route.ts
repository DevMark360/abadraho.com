import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { resendVerificationEmail, verifyEmail } from "@/server/services/auth.service";
import { attachSessionCookie } from "@/lib/auth";
import { z } from "zod";

export async function GET(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get("id"));
  const hash = request.nextUrl.searchParams.get("hash");
  if (!id || !hash) {
    return NextResponse.json({ success: false, message: "Invalid link" }, { status: 400 });
  }

  const result = await verifyEmail(id, hash);
  if (result.success && result.user) {
    const res = NextResponse.json(result);
    return attachSessionCookie(res, result.user);
  }
  return NextResponse.json(result, { status: 422 });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Sign in required" }, { status: 401 });
  }

  const body = await request.json();
  if (body.action === "resend") {
    const result = await resendVerificationEmail(session.id);
    return NextResponse.json(result, { status: result.success ? 200 : 429 });
  }

  const parsed = z.object({ id: z.number(), hash: z.string() }).safeParse(body);
  if (parsed.success) {
    const result = await verifyEmail(parsed.data.id, parsed.data.hash);
    if (result.success && result.user) {
      const res = NextResponse.json(result);
      return attachSessionCookie(res, result.user);
    }
    return NextResponse.json(result, { status: 422 });
  }

  return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
}
