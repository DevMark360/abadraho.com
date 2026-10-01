import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { findUserById, toSafeUser } from "@/server/services/auth.service";
import { attachSessionCookie, toSessionUser } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, user: null });
  }

  const row = await findUserById(session.id);
  if (row) {
    const safe = toSafeUser(row);
    const res = NextResponse.json({
      success: true,
      user: {
        ...toSessionUser(safe),
        address: row.address,
        city: row.city,
        aboutMe: row.aboutMe,
      },
    });
    return attachSessionCookie(res, safe);
  }

  return NextResponse.json({ success: true, user: session });
}
