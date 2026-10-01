import { NextRequest, NextResponse } from "next/server";
import { requireAdminProjectAccess } from "@/lib/admin-api-guard";
import { listUsersForNotify } from "@/server/services/admin-user.service";
import { notifyProjectUsers } from "@/server/services/admin-project.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);
  const auth = await requireAdminProjectAccess(projectId, "view");
  if (auth instanceof NextResponse) return auth;

  const items = await listUsersForNotify();
  return NextResponse.json({ success: true, items });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);
  const auth = await requireAdminProjectAccess(projectId, "edit");
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const userIds = Array.isArray(body.userIds)
    ? body.userIds.map((v: unknown) => Number(v)).filter((v: number) => Number.isFinite(v))
    : [];

  const result = await notifyProjectUsers(projectId, userIds, auth.session);
  if (result.error) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, count: result.count });
}
