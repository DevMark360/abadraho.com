import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-api-guard";
import { isFullStaff } from "@/lib/admin-rbac";
import {
  createTeam,
  listAllTeams,
  listJoinedTeams,
  listMyTeams,
  loadTeamCreateMeta,
} from "@/server/services/admin-team.service";

export async function GET(request: NextRequest) {
  const auth = await requireAdminSession();
  if (auth instanceof NextResponse) return auth;
  const session = auth.session;

  const mode = request.nextUrl.searchParams.get("mode") ?? "my";
  const meta = request.nextUrl.searchParams.get("meta") === "1";
  const staff = isFullStaff(session);

  if (meta) {
    const data = await loadTeamCreateMeta(session.id, staff);
    return NextResponse.json({ success: true, ...data });
  }

  if (mode === "joined") {
    const result = await listJoinedTeams(session.id);
    return NextResponse.json({ success: !result.error, items: result.items, error: result.error });
  }

  if (mode === "all" && staff) {
    const result = await listAllTeams();
    return NextResponse.json({ success: !result.error, items: result.items, error: result.error });
  }

  const result = await listMyTeams(session.id);
  return NextResponse.json({ success: !result.error, items: result.items, error: result.error });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminSession();
  if (auth instanceof NextResponse) return auth;
  const session = auth.session;
  const staff = isFullStaff(session);

  const body = await request.json();
  const memberIds = (body.memberIds ?? body.members ?? [])
    .map((x: unknown) => Number(x))
    .filter((n: number) => n > 0);
  const projectIds = (body.projectIds ?? body.projects ?? [])
    .map((x: unknown) => Number(x))
    .filter((n: number) => n > 0);
  const builderIds = (body.builderIds ?? body.builders ?? [])
    .map((x: unknown) => Number(x))
    .filter((n: number) => n > 0);

  const result = await createTeam(
    session.id,
    {
      name: String(body.name ?? ""),
      description: String(body.description ?? ""),
      memberIds,
      builderIds,
      projectIds,
    },
    { isStaff: staff }
  );

  return NextResponse.json(result, { status: result.success ? 200 : 422 });
}
