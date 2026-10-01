import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-api-guard";
import { isFullStaff } from "@/lib/admin-rbac";
import {
  deleteTeam,
  getTeamBySlug,
  updateTeamAssignments,
  userCanManageTeamBySlug,
  userCanViewTeamBySlug,
} from "@/server/services/admin-team.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireAdminSession();
  if (auth instanceof NextResponse) return auth;
  const session = auth.session;
  const staff = isFullStaff(session);

  const { slug } = await params;
  if (!staff) {
    const canView = await userCanViewTeamBySlug(session.id, slug);
    if (!canView) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }
  }

  const result = await getTeamBySlug(slug);
  if (!result.team) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Not found" },
      { status: 404 }
    );
  }

  const canManage = staff || (await userCanManageTeamBySlug(session.id, slug));
  return NextResponse.json({ success: true, team: result.team, canManage });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireAdminSession();
  if (auth instanceof NextResponse) return auth;
  const session = auth.session;
  const staff = isFullStaff(session);

  const { slug } = await params;
  if (!staff) {
    const canManage = await userCanManageTeamBySlug(session.id, slug);
    if (!canManage) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }
  }

  const body = await request.json();
  const memberIds = body.memberIds != null
    ? (body.memberIds as unknown[]).map((x) => Number(x)).filter((n) => n > 0)
    : undefined;
  const builderIds = body.builderIds != null
    ? (body.builderIds as unknown[]).map((x) => Number(x)).filter((n) => n > 0)
    : undefined;
  const projectIds = body.projectIds != null
    ? (body.projectIds as unknown[]).map((x) => Number(x)).filter((n) => n > 0)
    : undefined;

  const result = await updateTeamAssignments(
    slug,
    {
      name: body.name != null ? String(body.name) : undefined,
      description: body.description != null ? String(body.description) : undefined,
      memberIds,
      builderIds,
      projectIds,
    },
    { userId: session.id, isStaff: staff }
  );

  return NextResponse.json(result, { status: result.success ? 200 : 422 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requireAdminSession();
  if (auth instanceof NextResponse) return auth;
  const session = auth.session;
  const staff = isFullStaff(session);

  const { slug } = await params;
  if (!staff) {
    const canManage = await userCanManageTeamBySlug(session.id, slug);
    if (!canManage) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }
  }

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!id) {
    return NextResponse.json({ success: false, message: "id query required" }, { status: 400 });
  }

  const result = await getTeamBySlug(slug);
  if (!result.team || result.team.id !== id) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  await deleteTeam(id);
  return NextResponse.json({ success: true });
}
