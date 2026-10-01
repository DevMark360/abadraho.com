import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-session";
import {
  builderProjectIdsForSession,
  scopedProjectsWhere,
  scopedUnitsWhere,
} from "@/lib/admin-builder-ownership";
import { parsePaymentScheduleParams } from "@/lib/admin-inquiry-params";
import { listPaymentSchedules } from "@/server/services/admin-payment-schedule.service";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const filters = parsePaymentScheduleParams(request.nextUrl.searchParams);
  const builderScope = await builderProjectIdsForSession(session);
  if (builderScope !== undefined) {
    filters.builderProjectIds = builderScope;
  }

  const [result, projects, units] = await Promise.all([
    listPaymentSchedules(filters),
    prisma.project.findMany({
      where: scopedProjectsWhere(builderScope ?? null),
      orderBy: { name: "asc" },
      select: { id: true, name: true },
      take: builderScope === undefined ? 500 : undefined,
    }),
    prisma.unit.findMany({
      where: scopedUnitsWhere(builderScope ?? null),
      orderBy: { title: "asc" },
      select: { id: true, title: true },
      take: builderScope === undefined ? 2000 : undefined,
    }),
  ]);

  return NextResponse.json({
    success: !result.error,
    items: result.items,
    projects: projects.map((p) => ({ value: String(p.id), label: p.name })),
    units: units.map((u) => ({ value: String(u.id), label: u.title ?? `Unit #${u.id}` })),
    error: result.error,
  });
}
