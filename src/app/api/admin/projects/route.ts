import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import {
  builderProjectIdsForSession,
  scopedProjectsWhere,
} from "@/lib/admin-builder-ownership";
import { isFullStaff } from "@/lib/admin-rbac";
import { prisma } from "@/lib/prisma";
import {
  listAdminProjects,
  parseProjectListQuery,
  saveAdminProject,
} from "@/server/services/admin-project.service";
import { notifyProjectChanged } from "@/server/services/indexnow.service";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const filters = parseProjectListQuery(request.nextUrl.searchParams);
  const result = await listAdminProjects(filters, session);

  const builderScope = await builderProjectIdsForSession(session);
  let projectOptions: { value: string; label: string }[] = [];
  try {
    const rows = await prisma.project.findMany({
      where: scopedProjectsWhere(builderScope ?? null),
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: builderScope === undefined ? 5000 : undefined,
    });
    projectOptions = rows.map((p) => ({ value: String(p.id), label: p.name }));
  } catch {
    /* optional */
  }

  return NextResponse.json({
    success: !result.error,
    items: result.items,
    total: result.total,
    error: result.error,
    projectOptions,
    isFullStaff: isFullStaff(session),
  });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = await saveAdminProject(null, body, session);
  if (result.error || !result.project) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Create failed" },
      { status: 400 }
    );
  }
  notifyProjectChanged(result.project.id);
  return NextResponse.json({ success: true, id: result.project.id });
}
