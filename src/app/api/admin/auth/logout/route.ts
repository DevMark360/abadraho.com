import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/staff-admin-cookie";

export async function POST() {
  const res = NextResponse.json({ success: true });
  return clearAdminSessionCookie(res);
}
