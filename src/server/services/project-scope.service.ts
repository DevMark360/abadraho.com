import type { ProjectFilters } from "@/types/project";
import { isDatabaseEnabled } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { formatInstallmentPlanBadge } from "@/lib/project-display";
import { getTeamMemberProjectScope } from "@/server/services/admin-team.service";

export async function applyTeamMemberScopeToFilters(
  userId: number | null | undefined,
  filters: ProjectFilters
): Promise<ProjectFilters> {
  if (!userId) return filters;
  const scope = await getTeamMemberProjectScope(userId);
  if (scope === null) return filters;
  const { viewerUserId: _viewer, ...rest } = filters;
  return { ...rest, allowedProjectIds: scope };
}

/** Resolve filters for `listProjects` when `viewerUserId` may be present on filters. */
export async function resolveViewerProjectFilters(
  filters: ProjectFilters
): Promise<Omit<ProjectFilters, "viewerUserId">> {
  const { viewerUserId, ...rest } = filters;
  if (!viewerUserId) return rest;
  return applyTeamMemberScopeToFilters(viewerUserId, rest);
}

export async function filterIdsForTeamViewer(
  userId: number | null | undefined,
  ids: number[]
): Promise<number[]> {
  if (!userId || !ids.length) return ids;
  const scope = await getTeamMemberProjectScope(userId);
  if (scope === null) return ids;
  const allowed = new Set(scope);
  return ids.filter((id) => allowed.has(id));
}

export type ScopedFilterMeta = {
  builders: { value: string; label: string }[];
  unitTypes: { value: string; label: string }[];
  areas: { value: string; label: string; cityId: string | null }[];
  cities: { value: string; label: string }[];
  statuses: { value: string; label: string; dot?: string }[];
  plans: { value: string; label: string }[];
};

const emptyFilterMeta: ScopedFilterMeta = {
  builders: [],
  unitTypes: [],
  areas: [],
  cities: [],
  statuses: [],
  plans: [],
};

/** Filter dropdown options limited to team-assigned live projects. */
export async function loadTeamScopedFilterMeta(
  userId: number
): Promise<ScopedFilterMeta | null> {
  if (!isDatabaseEnabled()) return emptyFilterMeta;
  const scope = await getTeamMemberProjectScope(userId);
  if (scope === null) return null;
  if (!scope.length) return emptyFilterMeta;

  const projectWhere = {
    id: { in: scope },
    isArchive: false,
    status: 1,
  };

  const [projects, areaLinks] = await Promise.all([
    prisma.project.findMany({
      where: projectWhere,
      select: {
        installmentLength: true,
        projectTypeId: true,
        progressStatusId: true,
        progress: { select: { id: true, name: true } },
        owners: { select: { builder: { select: { id: true, fullName: true } } } },
        location: { select: { id: true, name: true, cityId: true } },
      },
    }),
    prisma.projectArea.findMany({
      where: { projectId: { in: scope } },
      select: { area: { select: { id: true, name: true, cityId: true } } },
    }),
  ]);

  const builderMap = new Map<number, string>();
  const typeMap = new Map<number, string>();
  const areaMap = new Map<number, { name: string; cityId: number | null }>();
  const cityIds = new Set<number>();
  const statusMap = new Map<number, { name: string }>();
  const seenPlans = new Set<number>();
  const plans: { value: string; label: string }[] = [];

  const typeIds = [...new Set(projects.map((p) => p.projectTypeId).filter((id): id is number => id != null))];
  const typeRows = typeIds.length
    ? await prisma.projectType.findMany({
        where: { id: { in: typeIds }, isArchive: false },
        select: { id: true, title: true },
      })
    : [];
  const typeTitleById = new Map(typeRows.map((t) => [t.id, t.title]));

  for (const p of projects) {
    for (const o of p.owners) {
      if (o.builder) builderMap.set(o.builder.id, o.builder.fullName);
    }
    if (p.projectTypeId != null && typeTitleById.has(p.projectTypeId)) {
      typeMap.set(p.projectTypeId, typeTitleById.get(p.projectTypeId)!);
    }
    if (p.location?.id) {
      areaMap.set(Number(p.location.id), { name: p.location.name, cityId: p.location.cityId });
      if (p.location.cityId != null) cityIds.add(p.location.cityId);
    }
    if (p.progress) statusMap.set(p.progress.id, { name: p.progress.name });
    const months = p.installmentLength;
    if (months != null && months > 0) {
      const bucket = Math.floor(months / 12) * 12;
      if (!seenPlans.has(bucket)) {
        seenPlans.add(bucket);
        plans.push({
          value: String(bucket),
          label: formatInstallmentPlanBadge(bucket) ?? `${months} months`,
        });
      }
    }
  }

  for (const link of areaLinks) {
    if (link.area) {
      areaMap.set(Number(link.area.id), { name: link.area.name, cityId: link.area.cityId });
      if (link.area.cityId != null) cityIds.add(link.area.cityId);
    }
  }

  const cityRows = cityIds.size
    ? await prisma.city.findMany({
        where: { id: { in: [...cityIds] } },
        select: { id: true, name: true },
      })
    : [];

  const statusDot = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("ready")) return "#22c55e";
    if (lower.includes("pre")) return "#ec4899";
    return "#6366f1";
  };

  return {
    builders: [...builderMap.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, label]) => ({ value: String(id), label })),
    unitTypes: [...typeMap.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, label]) => ({ value: String(id), label })),
    areas: [...areaMap.entries()]
      .sort((a, b) => a[1].name.localeCompare(b[1].name))
      .map(([id, a]) => ({
        value: String(id),
        label: a.name,
        cityId: a.cityId != null ? String(a.cityId) : null,
      })),
    cities: cityRows
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ value: String(c.id), label: c.name })),
    statuses: [...statusMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([id, s]) => ({
        value: String(id),
        label: s.name,
        dot: statusDot(s.name),
      })),
    plans: plans.sort((a, b) => Number(a.value) - Number(b.value)),
  };
}

export async function loadTeamScopedMetaAreas(userId: number) {
  const scope = await getTeamMemberProjectScope(userId);
  if (scope === null) return null;
  if (!scope.length) return [];

  const links = await prisma.projectArea.findMany({
    where: { projectId: { in: scope } },
    select: {
      area: { select: { id: true, name: true, createdAt: true, updatedAt: true } },
    },
    distinct: ["areaId"],
  });

  const byId = new Map<number, { id: number; name: string; created_at: Date; updated_at: Date }>();
  for (const link of links) {
    if (!link.area) continue;
    const areaId = Number(link.area.id);
    byId.set(areaId, {
      id: areaId,
      name: link.area.name,
      created_at: link.area.createdAt ?? new Date(0),
      updated_at: link.area.updatedAt ?? new Date(0),
    });
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}
