import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { findUserById, toSafeUser, updateProfile } from "@/server/services/auth.service";
import { attachSessionCookie, toSessionUser } from "@/lib/auth";
import { z } from "zod";
import { checkStoredPhone } from "@/lib/phone";

const schema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  aboutMe: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const user = await findUserById(session.id);
  if (!user) {
    return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
  }
  return NextResponse.json({
    success: true,
    user: {
      ...toSessionUser(toSafeUser(user)),
      address: user.address,
      city: user.city,
      aboutMe: user.aboutMe,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid data" }, { status: 422 });
  }

  // Name and WhatsApp number are required when sent (the profile form always sends them).
  if (parsed.data.firstName !== undefined && !parsed.data.firstName.trim()) {
    return NextResponse.json({ success: false, message: "First name is required." }, { status: 422 });
  }
  if (parsed.data.lastName !== undefined && !parsed.data.lastName.trim()) {
    return NextResponse.json({ success: false, message: "Last name is required." }, { status: 422 });
  }
  let phoneNumber = parsed.data.phoneNumber;
  if (phoneNumber !== undefined) {
    const phone = checkStoredPhone(phoneNumber);
    if (!phone.ok) {
      return NextResponse.json({ success: false, message: phone.message }, { status: 422 });
    }
    phoneNumber = phone.stored;
  }

  const user = await updateProfile(session.id, { ...parsed.data, phoneNumber });
  if (!user) {
    return NextResponse.json({ success: false, message: "Update failed" }, { status: 500 });
  }

  const res = NextResponse.json({ success: true, user: toSessionUser(user) });
  return attachSessionCookie(res, user);
}
