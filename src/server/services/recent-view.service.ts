import { authCookieOptions } from "@/lib/cookie-options";
import { isDatabaseEnabled } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { parseSignedJsonCookie, signJsonCookie } from "@/lib/signed-cookie";
import type { ProjectListItem } from "@/types/project";
import { uniqueNumericIds } from "@/lib/unique-by-id";
import { listProjects } from "@/server/services/project.service";

const GUEST_COOKIE = "abadraho_recent_views";
const MAX_RECENT = 12;
const GUEST_RECENT_MAX_AGE = 60 * 60 * 24 * 7;

export { GUEST_COOKIE, MAX_RECENT };

export function guestRecentViewsCookieOptions() {
  return authCookieOptions(GUEST_RECENT_MAX_AGE);
}

function normalizeGuestIds(ids: unknown[]): number[] {
  return uniqueNumericIds(ids.map(Number)).slice(0, MAX_RECENT);
}

export function serializeGuestRecentIds(ids: number[]): string {
  return signJsonCookie(normalizeGuestIds(ids));
}

export function parseGuestRecentIds(cookieValue: string | undefined): number[] {
  if (!cookieValue) return [];

  const signed = parseSignedJsonCookie<number[]>(cookieValue);
  if (signed && Array.isArray(signed)) {
    return normalizeGuestIds(signed);
  }

  try {
    const parsed = JSON.parse(cookieValue) as unknown;
    if (!Array.isArray(parsed)) return [];
    return normalizeGuestIds(parsed);
  } catch {
    return [];
  }
}

export async function recordRecentView(userId: number, projectId: number): Promise<void> {
  if (!isDatabaseEnabled()) return;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const existing = await prisma.recentView.findFirst({
    where: {
      userId,
      projectId,
      createdAt: { gte: startOfDay },
    },
  });

  if (existing) {
    await prisma.recentView.update({
      where: { id: existing.id },
      data: { updatedAt: new Date() },
    });
    return;
  }

  await prisma.recentView.create({
    data: {
      userId,
      projectId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function getUserRecentViews(
  userId: number,
  excludeProjectId?: number,
  limit = 8
): Promise<ProjectListItem[]> {
  if (!isDatabaseEnabled()) return [];

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const rows = await prisma.recentView.findMany({
    where: {
      userId,
      createdAt: { gte: startOfDay },
      ...(excludeProjectId ? { projectId: { not: excludeProjectId } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: { project: { include: { location: true, progress: true, owners: { include: { builder: true } } } } },
  });

  const all = await listProjects({ perPage: 200 });
  const out: ProjectListItem[] = [];
  const seenProjectIds = new Set<number>();

  for (const rv of rows) {
    if (rv.project.isArchive || seenProjectIds.has(rv.projectId)) continue;
    seenProjectIds.add(rv.projectId);
    const fromList = all.items.find((p) => p.id === rv.projectId);
    if (fromList) {
      out.push(fromList);
      continue;
    }
    const p = rv.project;
    out.push({
      id: p.id,
      name: p.name,
      slug: p.slug,
      area: p.location?.name ?? null,
      address: p.address,
      imageUrl: null,
      minPrice: p.minPrice != null ? Number(p.minPrice) : null,
      maxPrice: null,
      progressName: p.progress?.name ?? null,
      builderName: p.owners[0]?.builder?.fullName ?? null,
      handoverLabel: null,
      installmentMonths: p.installmentLength,
      views: p.views,
      hasDealBonus: false,
      latitude: p.latitude != null ? Number(p.latitude) : null,
      longitude: p.longitude != null ? Number(p.longitude) : null,
      statusBadge: null,
      handoverQuarter: null,
      paymentPlan: null,
      saleBadge: null,
      advised: false,
      builderLogoUrl: null,
    });
  }

  return out;
}

export function mergeGuestRecentIds(current: number[], projectId: number): number[] {
  const next = [projectId, ...current.filter((id) => id !== projectId)];
  return next.slice(0, MAX_RECENT);
}
