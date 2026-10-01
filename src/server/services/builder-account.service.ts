import { isDatabaseEnabled } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { loadBuilderAccessibleProjectIds } from "@/lib/admin-builder-ownership";
import { PROJECT_STATUS_LABELS } from "@/config/project-status";

export type BuilderAccountSummary = {
  live: number;
  onHold: number;
  rejected: number;
  totalProjects: number;
  units: number;
  inquiries: number;
  totalViews: number;
  recentProjects: {
    id: number;
    name: string;
    slug: string;
    status: number;
    statusLabel: string;
    updatedAt: string;
  }[];
};

export async function getBuilderAccountSummary(
  userId: number
): Promise<BuilderAccountSummary> {
  const empty: BuilderAccountSummary = {
    live: 0,
    onHold: 0,
    rejected: 0,
    totalProjects: 0,
    units: 0,
    inquiries: 0,
    totalViews: 0,
    recentProjects: [],
  };

  if (!isDatabaseEnabled()) return empty;

  const projectIds = await loadBuilderAccessibleProjectIds(userId);
  if (!projectIds.length) return empty;

  const [live, onHold, rejected, units, inquiries, viewsAgg, recent] = await Promise.all([
    prisma.project.count({
      where: { id: { in: projectIds }, isArchive: false, status: 1 },
    }),
    prisma.project.count({
      where: { id: { in: projectIds }, isArchive: false, status: 2 },
    }),
    prisma.project.count({
      where: { id: { in: projectIds }, isArchive: false, status: 3 },
    }),
    prisma.unit.count({
      where: { projectId: { in: projectIds }, isArchive: false },
    }),
    prisma.inquiry.count({
      where: { projectId: { in: projectIds } },
    }),
    prisma.project.aggregate({
      where: { id: { in: projectIds }, isArchive: false },
      _sum: { views: true },
    }),
    prisma.project.findMany({
      where: { id: { in: projectIds }, isArchive: false },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, name: true, slug: true, status: true, updatedAt: true },
    }),
  ]);

  return {
    live,
    onHold,
    rejected,
    totalProjects: projectIds.length,
    units,
    inquiries,
    totalViews: viewsAgg._sum.views ?? 0,
    recentProjects: recent.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      statusLabel: PROJECT_STATUS_LABELS[p.status] ?? `Status ${p.status}`,
      updatedAt: p.updatedAt.toISOString(),
    })),
  };
}
