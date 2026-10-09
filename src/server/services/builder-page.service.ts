import { getBuilderPageMediaOverride, listConfiguredBuilderPageSlugs } from "@/config/builder-pages";
import { isDatabaseEnabled } from "@/lib/db";
import { buildUniqueBuilderSlugs, type BuilderSlugEntry } from "@/lib/builder-slug";
import {
  defaultBuilderPublicDescription,
  resolveBuilderPublicAssets,
} from "@/lib/builder-public-assets";
import { prisma } from "@/lib/prisma";
import { listProjects } from "@/server/services/project.service";
import {
  EMPTY_BUILDER_RATING_DISTRIBUTION,
  type BuilderRatingDistribution,
} from "@/lib/builder-rating";
import {
  getBuilderRatingDistribution,
  getBuilderRatingStats,
  listBuilderReviews,
  type BuilderReviewItem,
} from "@/server/services/review.service";
import type { ProjectListItem } from "@/types/project";

/** Public marketing profile — no admin login email, phone, or home address. */
export type BuilderProfile = {
  id: number;
  fullName: string;
  imageUrl: string | null;
  memberSince: string | null;
};

export type BuilderPageData = {
  pageSlug: string;
  profile: BuilderProfile;
  coverImageUrl: string | null;
  projects: ProjectListItem[];
  totalProjects: number;
  projectCityCount: number;
  ratingAverage: number;
  ratingCount: number;
  ratingDistribution: BuilderRatingDistribution;
  reviews: BuilderReviewItem[];
  description: string;
  progressFilterOptions: { value: string; label: string }[];
};

async function listActiveBuilders() {
  return prisma.builder.findMany({
    where: { isArchive: false },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });
}

async function listPublicBuilderSlugsFromDb(): Promise<BuilderSlugEntry[]> {
  const rows = await listActiveBuilders();
  return buildUniqueBuilderSlugs(rows);
}

async function resolveBuilderIdFromConfiguredSlug(slug: string): Promise<number | null> {
  const override = getBuilderPageMediaOverride(slug);
  if (!override?.nameMatch?.trim()) return null;

  const row = await prisma.builder.findFirst({
    where: {
      isArchive: false,
      fullName: { contains: override.nameMatch.trim() },
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return row?.id ?? null;
}

export async function listPublicBuilderSlugs(): Promise<BuilderSlugEntry[]> {
  if (!isDatabaseEnabled()) return listConfiguredBuilderPageSlugs().map((slug) => ({
    id: 0,
    fullName: slug,
    slug,
  }));

  try {
    const fromDb = await listPublicBuilderSlugsFromDb();
    const bySlug = new Map(fromDb.map((entry) => [entry.slug, entry]));

    for (const slug of listConfiguredBuilderPageSlugs()) {
      if (bySlug.has(slug)) continue;
      const builderId = await resolveBuilderIdFromConfiguredSlug(slug);
      if (!builderId) continue;
      const builder = fromDb.find((entry) => entry.id === builderId);
      bySlug.set(slug, {
        id: builderId,
        fullName: builder?.fullName ?? slug,
        slug,
      });
    }

    return [...bySlug.values()].sort((a, b) => a.fullName.localeCompare(b.fullName));
  } catch {
    return [];
  }
}

export async function resolveBuilderIdBySlug(slug: string): Promise<number | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized || !isDatabaseEnabled()) return null;

  try {
    const fromDb = await listPublicBuilderSlugsFromDb();
    const direct = fromDb.find((entry) => entry.slug === normalized);
    if (direct) return direct.id;

    return resolveBuilderIdFromConfiguredSlug(normalized);
  } catch {
    return null;
  }
}

function formatMemberSince(date: Date | null | undefined): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-PK", { month: "long", year: "numeric" }).format(date);
}

async function loadMemberSince(
  builderId: number,
  userId: number | null
): Promise<Date | null> {
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    if (user?.createdAt) return user.createdAt;
  }

  const row = await prisma.projectOwner.findFirst({
    where: { builderId, project: { isArchive: false, status: 1 } },
    orderBy: { project: { createdAt: "asc" } },
    select: { project: { select: { createdAt: true } } },
  });
  return row?.project.createdAt ?? null;
}

async function loadBuilderProfile(builderId: number): Promise<BuilderProfile | null> {
  const row = await prisma.builder.findFirst({
    where: { id: builderId, isArchive: false },
    select: {
      id: true,
      fullName: true,
      userId: true,
    },
  });
  if (!row) return null;

  const memberSinceDate = await loadMemberSince(builderId, row.userId);

  return {
    id: row.id,
    fullName: row.fullName,
    imageUrl: null,
    memberSince: formatMemberSince(memberSinceDate),
  };
}

function buildProgressFilterOptions(projects: ProjectListItem[]) {
  const names = new Set<string>();
  for (const project of projects) {
    const label = project.progressName ?? project.statusBadge;
    if (label?.trim()) names.add(label.trim());
  }
  return [...names]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ value: name, label: name }));
}

function countProjectCities(projects: ProjectListItem[]): number {
  const cities = new Set<string>();
  for (const project of projects) {
    const area = project.area?.trim();
    if (area) cities.add(area);
  }
  return cities.size;
}

export async function getBuilderPageData(
  pageSlug: string,
  viewerUserId?: number | null
): Promise<BuilderPageData | null> {
  const normalizedSlug = pageSlug.trim().toLowerCase();
  if (!normalizedSlug || !isDatabaseEnabled()) return null;

  try {
    const builderId = await resolveBuilderIdBySlug(normalizedSlug);
    if (!builderId) return null;

    const profile = await loadBuilderProfile(builderId);
    if (!profile) return null;

    const media = getBuilderPageMediaOverride(normalizedSlug);
    const assets = resolveBuilderPublicAssets(normalizedSlug);
    const displayName = media?.displayName?.trim() || profile.fullName;

    profile.fullName = displayName;
    profile.imageUrl = media?.profileImageUrl ?? assets.profileImageUrl ?? null;

    const [{ items, total }, stats, distribution, reviews] = await Promise.all([
      listProjects({
        developerIds: [builderId],
        page: 1,
        perPage: 100,
        viewerUserId: viewerUserId ?? undefined,
      }),
      // Ratings and reviews are extras: if they fail, show the page without them instead of a 404.
      getBuilderRatingStats(builderId).catch((e) => {
        console.error("[builder-page] rating stats", normalizedSlug, e);
        return { average: 0, count: 0 };
      }),
      getBuilderRatingDistribution(builderId).catch((e) => {
        console.error("[builder-page] rating distribution", normalizedSlug, e);
        return EMPTY_BUILDER_RATING_DISTRIBUTION;
      }),
      listBuilderReviews(builderId).catch((e) => {
        console.error("[builder-page] reviews", normalizedSlug, e);
        return [] as BuilderReviewItem[];
      }),
    ]);

    const description =
      media?.publicDescription?.trim() || defaultBuilderPublicDescription(displayName);

    return {
      pageSlug: normalizedSlug,
      profile,
      coverImageUrl: media?.coverImageUrl ?? assets.coverImageUrl ?? null,
      projects: items,
      totalProjects: total,
      projectCityCount: countProjectCities(items),
      ratingAverage: stats.average,
      ratingCount: stats.count,
      ratingDistribution: distribution,
      reviews,
      description,
      progressFilterOptions: buildProgressFilterOptions(items),
    };
  } catch (e) {
    // Shows as a 404 to visitors; log so a broken builder page is diagnosable from the server log.
    console.error("[builder-page] failed to load", normalizedSlug, e);
    return null;
  }
}
