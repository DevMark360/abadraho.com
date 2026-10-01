import { NextRequest, NextResponse } from "next/server";
import { requireAdminEventAccess } from "@/lib/admin-api-guard";
import { listUsersForNotify } from "@/server/services/admin-user.service";
import { notifyEventUsers } from "@/server/services/admin-event.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = Number(id);
  const auth = await requireAdminEventAccess(eventId, "view");
  if (auth instanceof NextResponse) return auth;

  const items = await listUsersForNotify();
  return NextResponse.json({ success: true, items });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const eventId = Number(id);
  const auth = await requireAdminEventAccess(eventId, "edit");
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const userIds = Array.isArray(body.userIds)
    ? body.userIds.map((v: unknown) => Number(v)).filter((v: number) => Number.isFinite(v))
    : [];

  const result = await notifyEventUsers(eventId, userIds, auth.session);
  if (result.error) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, count: result.count });
}
