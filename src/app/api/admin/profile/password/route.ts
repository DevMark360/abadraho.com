import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { changeAdminPassword } from "@/server/services/admin-profile.service";

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = await changeAdminPassword(
    session,
    String(body.oldPassword ?? body.old_password ?? ""),
    String(body.newPassword ?? body.new_password ?? ""),
    String(body.confirmPassword ?? body.confirm_password ?? "")
  );
  return NextResponse.json(
    { status: result.success, success: result.success, message: result.message },
    { status: result.success ? 200 : 422 }
  );
}
