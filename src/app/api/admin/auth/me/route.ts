import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { isSuperAdminSession, resolveSessionNavPermissions } from "@/lib/staff-rbac";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const { permissions, enforcePermissions } = await resolveSessionNavPermissions(session);

  return NextResponse.json({
    success: true,
    admin: session,
    permissions,
    enforcePermissions,
    isSuperAdmin: isSuperAdminSession(session),
  });
}
