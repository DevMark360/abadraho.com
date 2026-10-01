import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import { isFullStaff } from "@/lib/admin-rbac";
import {
  builderProjectIdsForSession,
  scopedProjectsWhere,
  scopedUnitsWhere,
} from "@/lib/admin-builder-ownership";
import { parsePropertyInquiryParams } from "@/lib/admin-inquiry-params";
import {
  listPropertyInquiries,
  redactInquiryForBuilder,
} from "@/server/services/admin-inquiry.service";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const fullStaff = isFullStaff(session);
  const filters = parsePropertyInquiryParams(request.nextUrl.searchParams);
  const builderScope = await builderProjectIdsForSession(session);
  if (builderScope !== undefined) {
    filters.builderProjectIds = builderScope;
  }

  const [result, projects, units] = await Promise.all([
    listPropertyInquiries(filters),
    prisma.project.findMany({
      where: scopedProjectsWhere(builderScope ?? null),
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: builderScope === undefined ? 500 : undefined,
    }),
    prisma.unit.findMany({
      where: scopedUnitsWhere(builderScope ?? null),
      orderBy: { title: "asc" },
      select: { id: true, title: true, projectId: true },
      take: builderScope === undefined ? 2000 : undefined,
    }),
  ]);

  const items = fullStaff
    ? result.items
    : result.items.map((item) => redactInquiryForBuilder(item));

  return NextResponse.json({
    success: !result.error,
    items,
    total: result.total,
    isFullStaff: fullStaff,
    projects: projects.map((p) => ({ value: String(p.id), label: p.name })),
    units: units.map((u) => ({
      value: String(u.id),
      label: u.title ?? `Unit #${u.id}`,
      projectId: u.projectId,
    })),
    error: result.error,
  });
}
