/**
 * Project recommendations based on recently viewed projects.
 * Scoring: same area > same builder > similar price range.
 * No extra DB table needed — works off existing project data.
 */

import { isDatabaseEnabled } from "@/lib/db";
import { queryRaw } from "@/lib/prisma-raw";
import { listProjects } from "@/server/services/project.service";
import { v2ProjectAssetUrl } from "@/lib/project-media";
import type { ProjectListItem } from "@/types/project";

interface SeedProject {
  id: number;
  areaIds?: number[];
  builderIds?: number[];
  minPrice?: number | null;
}

/** Fetch area + builder IDs for a list of project IDs. */
async function fetchSeedData(projectIds: number[]): Promise<SeedProject[]> {
  if (!projectIds.length) return [];

  const placeholders = projectIds.map(() => "?").join(",");

  const [areaRows, builderRows, priceRows] = await Promise.all([
    queryRaw<{ project_id: number | bigint; area_id: number | bigint }[]>(
      `SELECT project_id, area_id FROM project_area WHERE project_id IN (${placeholders})`,
      ...projectIds
    ).catch(() => [] as { project_id: number | bigint; area_id: number | bigint }[]),

    queryRaw<{ project_id: number | bigint; builder_id: number | bigint }[]>(
      `SELECT project_id, builder_id FROM project_owner WHERE project_id IN (${placeholders})`,
      ...projectIds
    ).catch(() => [] as { project_id: number | bigint; builder_id: number | bigint }[]),

    queryRaw<{ id: number | bigint; min_price: number | null }[]>(
      `SELECT id, min_price FROM projects WHERE id IN (${placeholders})`,
      ...projectIds
    ).catch(() => [] as { id: number | bigint; min_price: number | null }[]),
  ]);

  return projectIds.map((id) => ({
    id,
    areaIds: areaRows
      .filter((r) => Number(r.project_id) === id)
      .map((r) => Number(r.area_id)),
    builderIds: builderRows
      .filter((r) => Number(r.project_id) === id)
      .map((r) => Number(r.builder_id)),
    minPrice: priceRows.find((r) => Number(r.id) === id)?.min_price ?? null,
  }));
}

export interface RecommendedProject extends ProjectListItem {
  recommendReason: string;
}

/**
 * Get personalized project recommendations based on recently viewed project IDs.
 * Returns up to `limit` projects not already in `viewedIds`.
 */
export async function getRecommendations(
  viewedIds: number[],
  limit = 6,
  viewerUserId?: number | null
): Promise<RecommendedProject[]> {
  if (!isDatabaseEnabled() || !viewedIds.length) return [];

  try {
    const seeds = await fetchSeedData(viewedIds.slice(0, 10));

    const allAreaIds = [...new Set(seeds.flatMap((s) => s.areaIds ?? []))];
    const allBuilderIds = [...new Set(seeds.flatMap((s) => s.builderIds ?? []))];
    const prices = seeds.map((s) => s.minPrice).filter((p): p is number => p != null && p > 0);
    const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;

    if (!allAreaIds.length && !allBuilderIds.length) return [];

    const listBase = viewerUserId ? { viewerUserId } : {};

    // Fetch candidates: by area first, then by builder
    const [byArea, byBuilder] = await Promise.all([
      allAreaIds.length
        ? listProjects({ areaIds: allAreaIds, perPage: 30, page: 1, ...listBase })
        : Promise.resolve({ items: [] as ProjectListItem[] }),

      allBuilderIds.length
        ? listProjects({ developerIds: allBuilderIds, perPage: 20, page: 1, ...listBase })
        : Promise.resolve({ items: [] as ProjectListItem[] }),
    ]);

    // Also fetch by price range if we have an average price
    const byPrice = avgPrice
      ? await listProjects({
          minPrice: Math.round(avgPrice * 0.5),
          maxPrice: Math.round(avgPrice * 1.8),
          perPage: 20,
          page: 1,
          ...listBase,
        })
      : { items: [] as ProjectListItem[] };

    // Merge + deduplicate, exclude already viewed
    const viewedSet = new Set(viewedIds);
    const seen = new Set<number>();
    const candidates: Array<{ project: ProjectListItem; score: number; reason: string }> = [];

    const allCandidates = [
      ...byArea.items,
      ...byBuilder.items,
      ...byPrice.items,
    ];

    for (const project of allCandidates) {
      if (viewedSet.has(project.id) || seen.has(project.id)) continue;
      seen.add(project.id);

      let score = 0;
      let reason = "Similar properties";

      // Area match — highest weight (3 pts)
      const inArea = byArea.items.some((p) => p.id === project.id);
      if (inArea) {
        score += 3;
        reason = `In ${project.area ?? "your preferred area"}`;
      }

      // Builder match — medium weight (2 pts)
      const inBuilder = byBuilder.items.some((p) => p.id === project.id);
      if (inBuilder) {
        score += 2;
        if (!inArea) reason = `By ${project.builderName ?? "preferred builder"}`;
      }

      // Price proximity — scaled weight (0–2 pts)
      if (avgPrice && project.minPrice && project.minPrice > 0) {
        const ratio =
          Math.min(project.minPrice, avgPrice) / Math.max(project.minPrice, avgPrice);
        if (ratio >= 0.85) {
          score += 2;
          if (!inArea && !inBuilder) reason = "Similar price range";
        } else if (ratio >= 0.6) {
          score += 1;
          if (!inArea && !inBuilder) reason = "Similar price range";
        }
      }

      candidates.push({ project, score, reason });
    }

    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ project, reason }) => ({ ...project, recommendReason: reason }));
  } catch {
    return [];
  }
}
