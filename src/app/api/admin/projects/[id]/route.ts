import { NextRequest, NextResponse } from "next/server";
import { requireAdminProjectAccess } from "@/lib/admin-api-guard";
import { isFullStaff } from "@/lib/admin-rbac";
import { toJsonSafe } from "@/lib/prisma-json";
import {
  archiveAdminProject,
  getAdminProjectDetail,
  saveAdminProject,
} from "@/server/services/admin-project.service";
import { notifyProjectChanged } from "@/server/services/indexnow.service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);
  const auth = await requireAdminProjectAccess(projectId);
  if (auth instanceof NextResponse) return auth;

  const result = await getAdminProjectDetail(projectId);
  if (!result.project) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Not found" },
      { status: 404 }
    );
  }
  return NextResponse.json(
    toJsonSafe({ success: true, project: result.project, isFullStaff: isFullStaff(auth.session) })
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);
  const auth = await requireAdminProjectAccess(projectId, "edit");
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const result = await saveAdminProject(projectId, body, auth.session);
  if (result.error) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  notifyProjectChanged(projectId);
  return NextResponse.json({ success: true, id: result.project?.id });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const projectId = Number(id);
  const auth = await requireAdminProjectAccess(projectId, "delete");
  if (auth instanceof NextResponse) return auth;

  try {
    await archiveAdminProject(projectId);
    notifyProjectChanged(projectId);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 400 });
  }
}
