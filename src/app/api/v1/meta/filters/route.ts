import { NextResponse } from "next/server";
import { isDatabaseEnabled } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { formatInstallmentPlanBadge } from "@/lib/project-display";
import { loadTeamScopedFilterMeta } from "@/server/services/project-scope.service";

export async function GET() {
  const session = await getSession();
  if (session?.id) {
    const scoped = await loadTeamScopedFilterMeta(session.id);
    if (scoped) return NextResponse.json(scoped);
  }

  if (!isDatabaseEnabled()) {
    return NextResponse.json({
      builders: [],
      unitTypes: [],
      areas: [],
      cities: [],
      statuses: [],
      plans: [],
    });
  }

  try {
    const [builders, unitTypes, areas, cities, progressRows, planRows] = await Promise.all([
      prisma.builder.findMany({
        where: {
          isArchive: false,
          projectOwners: { some: { project: { isArchive: false, status: 1 } } },
        },
        select: { id: true, fullName: true },
        orderBy: { fullName: "asc" },
      }),
      prisma.projectType.findMany({
        where: { isArchive: false },
        select: { id: true, title: true },
        orderBy: { title: "asc" },
      }),
      prisma.area.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, cityId: true },
      }),
      prisma.city.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.progress.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { id: "asc" },
      }),
      prisma.project.findMany({
        where: {
          isArchive: false,
          status: 1,
          installmentLength: { not: null },
        },
        select: { installmentLength: true },
        distinct: ["installmentLength"],
        orderBy: { installmentLength: "asc" },
      }),
    ]);

    const seenPlans = new Set<number>();
    const plans: { value: string; label: string }[] = [];
    for (const row of planRows) {
      const months = row.installmentLength;
      if (months == null || months <= 0) continue;
      const bucket = Math.floor(months / 12) * 12;
      if (seenPlans.has(bucket)) continue;
      seenPlans.add(bucket);
      plans.push({
        value: String(bucket),
        label: formatInstallmentPlanBadge(bucket) ?? `${months} months`,
      });
    }

    return NextResponse.json({
      builders: builders.map((b) => ({
        value: String(b.id),
        label: b.fullName,
      })),
      unitTypes: unitTypes.map((t) => ({
        value: String(t.id),
        label: t.title,
      })),
      areas: areas.map((a) => ({
        value: String(a.id),
        label: a.name,
        cityId: a.cityId != null ? String(a.cityId) : null,
      })),
      cities: cities.map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
      statuses: progressRows.map((p) => ({
        value: String(p.id),
        label: p.name,
        dot:
          p.name.toLowerCase().includes("ready") ? "#22c55e"
          : p.name.toLowerCase().includes("pre") ? "#ec4899"
          : "#6366f1",
      })),
      plans,
    });
  } catch {
    return NextResponse.json({
      builders: [],
      unitTypes: [],
      areas: [],
      cities: [],
      statuses: [],
      plans: [],
    });
  }
}
