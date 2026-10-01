import { clampIdList, LISTINGS_PAGE_SIZE } from "@/lib/pagination";
import { isDatabaseEnabled } from "@/lib/db";
import { approvedReviewWhere } from "@/lib/review-status";
import {
  resolveListingImageUrl,
  summarizeListingUnits,
  type ListingUnitRow,
} from "@/lib/project-list-card";
import { prisma } from "@/lib/prisma";
import { mockProjects } from "@/data/mock-projects";
import {
  buildProjectWhere,
} from "@/server/services/project-filter.service";
import { resolveViewerProjectFilters } from "@/server/services/project-scope.service";
import {
  formatInstallmentPlanBadge,
  formatPaymentPlanLabel,
} from "@/lib/project-display";
import {
  loadAreaIdsByProjectIds,
  loadAreaNamesByProjectIds,
} from "@/server/services/project-area.service";
import {
  mapMatchedUnitSummary,
  scoreProjectMatch,
  shouldShowMatchedUnitPrice,
  shouldUseMatchScoring,
  type ProjectForMatch,
} from "@/lib/filter-match-tiers";
import { normalizePakistanCoords } from "@/lib/map-karachi";
import { uniqueById, uniqueNumericIds } from "@/lib/unique-by-id";
import type { ProjectFilters, ProjectListItem } from "@/types/project";

export type ProjectDataSource = "db" | "mock";

function projectCoords(
  latitude: unknown,
  longitude: unknown
): { latitude: number | null; longitude: number | null } {
  const normalized = normalizePakistanCoords(
    latitude == null ? null : Number(latitude),
    longitude == null ? null : Number(longitude)
  );
  return {
    latitude: normalized?.lat ?? null,
    longitude: normalized?.lng ?? null,
  };
}

function mapDbProject(
  p: {
    id: number;
    name: string;
    slug: string;
    address: string | null;
    latitude?: unknown;
    longitude?: unknown;
    projectCoverImg?: string | null;
    projectImgs?: string | null;
    minPrice?: unknown;
    discountPrice: unknown;
    installmentLength: number | null;
    views: number;
    progressLabel?: string | null;
    location?: { name: string } | null;
    progress?: { name: string } | null;
    owners?: { builder: { fullName: string } }[];
    units?: ListingUnitRow[];
  },
  areaLabel?: string | null
): ProjectListItem {
  const unitSummary = summarizeListingUnits(p.units ?? []);
  const prices = (p.units ?? [])
    .map((u) => Number(u.price))
    .filter((n) => !Number.isNaN(n) && n > 0);
  const progressName = p.progress?.name ?? p.progressLabel ?? null;
  const months = p.installmentLength;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    area: areaLabel ?? p.location?.name ?? null,
    address: p.address,
    imageUrl: resolveListingImageUrl(p.projectCoverImg, p.projectImgs),
    minPrice:
      unitSummary.minPrice ??
      (prices.length ? Math.min(...prices) : null) ??
      (Number(p.minPrice) || Number(p.discountPrice) || null),
    maxPrice: unitSummary.maxPrice ?? (prices.length ? Math.max(...prices) : null),
    progressName,
    builderName: p.owners?.[0]?.builder?.fullName ?? null,
    handoverLabel: formatInstallmentPlanBadge(months),
    installmentMonths: months,
    views: p.views,
    ...projectCoords(p.latitude, p.longitude),
    handoverQuarter: formatInstallmentPlanBadge(months),
    paymentPlan: formatPaymentPlanLabel(months),
    statusBadge: progressName,
    minMonthlyInstallment: unitSummary.minMonthlyInstallment,
    bedroomLabel: unitSummary.bedroomLabel,
    minAreaSqFt: unitSummary.minAreaSqFt,
    maxAreaSqFt: unitSummary.maxAreaSqFt,
  };
}

function filterMock(items: ProjectListItem[], filters: ProjectFilters): ProjectListItem[] {
  let result = [...items];
  if (filters.query) {
    const q = filters.query.toLowerCase();
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.area?.toLowerCase().includes(q) ?? false) ||
        (p.builderName?.toLowerCase().includes(q) ?? false) ||
        (p.address?.toLowerCase().includes(q) ?? false)
    );
  }
  if (filters.minPrice != null) {
    result = result.filter((p) => (p.minPrice ?? 0) >= filters.minPrice!);
  }
  if (filters.maxPrice != null) {
    result = result.filter((p) => (p.minPrice ?? 0) <= filters.maxPrice!);
  }
  if (filters.developerIds?.length) {
    result = result.filter((p) =>
      filters.developerIds!.some((id) => p.builderName?.includes(String(id)))
    );
  }
  if (filters.statusFilters?.length) {
    result = result.filter((p) =>
      filters.statusFilters!.some((s) =>
        p.progressName?.toLowerCase().includes(s.replace(/-/g, " "))
      )
    );
  }
  if (filters.withDealBonus) {
    result = result.filter((p) => p.hasDealBonus);
  }
  return result;
}

async function listFromFallback(
  filters: ProjectFilters,
  perPage: number,
  page: number
): Promise<{ items: ProjectListItem[]; total: number; source: ProjectDataSource }> {
  const filtered = filterMock(mockProjects, filters);
  const start = (page - 1) * perPage;
  return {
    items: filtered.slice(start, start + perPage),
    total: filtered.length,
    source: "mock",
  };
}

export async function listProjects(
  filters: ProjectFilters = {}
): Promise<{ items: ProjectListItem[]; total: number; source: ProjectDataSource }> {
  const effectiveFilters = await resolveViewerProjectFilters(filters);
  const perPage = effectiveFilters.perPage ?? LISTINGS_PAGE_SIZE;
  const page = effectiveFilters.page ?? 1;

  if (!isDatabaseEnabled()) {
    return listFromFallback(effectiveFilters, perPage, page);
  }

  try {
    const where = await buildProjectWhere(effectiveFilters);
    const useScoring = shouldUseMatchScoring(effectiveFilters);
    const skip = (page - 1) * perPage;

    const projectInclude = {
      location: true,
      progress: true,
      owners: { include: { builder: true } },
      units: {
        take: 30,
        where: { isArchive: false },
        select: {
          price: true,
          downPayment: true,
          monthlyInstallment: true,
          rooms: true,
          title: true,
          grossArea: true,
          size: true,
        },
      },
    } as const;

    if (!useScoring) {
      const [total, rows] = await Promise.all([
        prisma.project.count({ where }),
        prisma.project.findMany({
          where,
          include: projectInclude,
          orderBy: { id: "desc" },
          skip,
          take: perPage,
        }),
      ]);

      const projectIds = rows.map((r) => r.id);
      const areaNamesMap = await loadAreaNamesByProjectIds(projectIds);
      const items = rows.map((r) =>
        mapDbProject(r, areaNamesMap.get(r.id) ?? r.location?.name ?? null)
      );

      return { items: uniqueById(items), total, source: "db" };
    }

    let rows = await prisma.project.findMany({
      where,
      include: projectInclude,
      orderBy: { id: "desc" },
    });

    const projectIds = rows.map((r) => r.id);
    const [areaNamesMap, areaIdsMap] = await Promise.all([
      loadAreaNamesByProjectIds(projectIds),
      loadAreaIdsByProjectIds(projectIds),
    ]);

    const scored: ProjectListItem[] = [];

    for (const r of rows) {
      const item = mapDbProject(
        r,
        areaNamesMap.get(r.id) ?? r.location?.name ?? null
      );

      const projectForMatch: ProjectForMatch = {
          id: r.id,
          name: r.name,
          address: r.address,
          locationName: r.location?.name ?? null,
          projectTypeId: r.projectTypeId,
          progressStatusId: r.progressStatusId,
          progressLabel: r.progressLabel,
          installmentLength: r.installmentLength,
          minPrice: r.minPrice,
          discountPrice: r.discountPrice,
          areaIds: areaIdsMap.get(r.id) ?? [],
          developerIds: (r.owners ?? []).map((o) => o.builderId),
          developerNames: (r.owners ?? [])
            .map((o) => o.builder?.fullName)
            .filter((n): n is string => Boolean(n)),
          units: r.units ?? [],
        };
        const match = scoreProjectMatch(projectForMatch, filters);
        if (!match) continue;

        item.matchScore = match.matchScore;
        item.totalActiveFilters = match.totalActiveFilters;
        item.matchTierId = match.tierId;
        item.matchedUnit = shouldShowMatchedUnitPrice(match.matchedFilters)
          ? mapMatchedUnitSummary(match.unit)
          : null;
        item.matchedFilters = match.matchedFilters;
        item.matchFailedFilters = match.failedFilters;

      scored.push(item);
    }

    scored.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));

    const total = scored.length;
    const items = uniqueById(scored.slice((page - 1) * perPage, page * perPage));

    return {
      items,
      total,
      source: "db",
    };
  } catch {
    return listFromFallback(filters, perPage, page);
  }
}

export async function listProjectsByIds(
  ids: number[],
  viewerUserId?: number | null
): Promise<ProjectListItem[]> {
  let idList = uniqueNumericIds(clampIdList(ids));
  if (viewerUserId) {
    const { filterIdsForTeamViewer } = await import("@/server/services/project-scope.service");
    idList = await filterIdsForTeamViewer(viewerUserId, idList);
  }
  if (!idList.length) return [];

  if (!isDatabaseEnabled()) {
    const byId = new Map(mockProjects.map((p) => [p.id, p]));
    return idList.map((id) => byId.get(id)).filter((p): p is ProjectListItem => p != null);
  }

  try {
    const rows = await prisma.project.findMany({
      where: { id: { in: idList }, isArchive: false, status: 1 },
      include: {
        location: true,
        progress: true,
        owners: { include: { builder: true } },
        units: {
          take: 30,
          where: { isArchive: false },
          select: {
            price: true,
            downPayment: true,
            monthlyInstallment: true,
            rooms: true,
            title: true,
          },
        },
      },
    });

    const areaNamesMap = await loadAreaNamesByProjectIds(rows.map((r) => r.id));
    const byId = new Map(
      rows.map((r) => [
        r.id,
        mapDbProject(r, areaNamesMap.get(r.id) ?? r.location?.name ?? null),
      ])
    );
    return idList.map((id) => byId.get(id)).filter((p): p is ProjectListItem => p != null);
  } catch {
    const byId = new Map(mockProjects.map((p) => [p.id, p]));
    return idList.map((id) => byId.get(id)).filter((p): p is ProjectListItem => p != null);
  }
}

export async function getProjectBySlug(slug: string) {
  if (!isDatabaseEnabled()) {
    return mockProjects.find((p) => p.slug === slug) ?? null;
  }
  try {
    const project = await prisma.project.findFirst({
      where: { slug, isArchive: false },
      include: {
        location: true,
        progress: true,
        units: { where: { isArchive: false } },
        owners: { include: { builder: true } },
        reviews: { where: approvedReviewWhere },
      },
    });
    if (!project) return mockProjects.find((p) => p.slug === slug) ?? null;
    return mapDbProject(project);
  } catch {
    return mockProjects.find((p) => p.slug === slug) ?? null;
  }
}
