import { isDatabaseEnabled } from "@/lib/db";
import { queryRaw } from "@/lib/prisma-raw";
import { popularPlaces } from "@/config/marketing";
import { getTeamMemberProjectScope } from "@/server/services/admin-team.service";
import { listProjects } from "@/server/services/project.service";
import { listProjectsCached } from "@/server/services/project-list-cache.service";
import type { ProjectFilters, ProjectListItem } from "@/types/project";

function normalizeAreaToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function areaTokensMatch(a: string, b: string): boolean {
  const left = normalizeAreaToken(a);
  const right = normalizeAreaToken(b);
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}

/** Pre-resolved team scope → list filters (avoids repeated scope lookups per query). */
function filtersFromScope(scope: number[] | null | undefined): Omit<ProjectFilters, "viewerUserId"> {
  if (scope === null || scope === undefined) return {};
  return { allowedProjectIds: scope };
}

async function resolveHomeScope(
  viewerUserId?: number | null
): Promise<number[] | null | undefined> {
  if (!viewerUserId) return undefined;
  return getTeamMemberProjectScope(viewerUserId);
}

/** Reuse the main listing pipeline so featured cards match search results. */
export async function getFeaturedProjects(
  limit = 8,
  viewerUserId?: number | null
): Promise<ProjectListItem[]> {
  const scope = await resolveHomeScope(viewerUserId);
  const { items } = await listProjects({
    perPage: limit,
    page: 1,
    ...filtersFromScope(scope),
  });
  return items;
}

async function countProjectsForPlace(
  query: string,
  displayName: string,
  scope: number[] | null | undefined
): Promise<number> {
  const { total: textTotal } = await listProjects({
    query,
    perPage: 1,
    page: 1,
    ...filtersFromScope(scope),
  });
  if (textTotal > 0) return textTotal;

  if (!isDatabaseEnabled()) return 0;
  if (scope !== null && scope !== undefined && !scope.length) return 0;

  try {
    const pattern = `%${query}%`;
    const namePattern = `%${displayName}%`;
    const scopeSql =
      scope != null ? `AND p.id IN (${scope.map(() => "?").join(",")})` : "";
    const rows = await queryRaw<{ cnt: number | bigint }[]>(
      `SELECT COUNT(DISTINCT p.id) AS cnt
       FROM projects p
       LEFT JOIN areas loc ON loc.id = p.area
       LEFT JOIN project_area pa ON pa.project_id = p.id
       LEFT JOIN areas linked ON linked.id = pa.area_id
       WHERE p.is_archive = 0
         AND p.status = 1
         ${scopeSql}
         AND (
           p.name LIKE ?
           OR p.address LIKE ?
           OR loc.name LIKE ?
           OR linked.name LIKE ?
           OR loc.name LIKE ?
           OR linked.name LIKE ?
         )`,
      ...(scope ?? []),
      pattern,
      pattern,
      pattern,
      pattern,
      namePattern,
      namePattern
    );
    return Number(rows[0]?.cnt ?? 0);
  } catch {
    return textTotal;
  }
}

async function getListingAreaBreakdown(
  limit = 8,
  scope: number[] | null | undefined = undefined
): Promise<Record<string, number>> {
  if (!isDatabaseEnabled()) return {};
  if (scope !== null && scope !== undefined && !scope.length) return {};

  try {
    const scopeSql =
      scope != null ? `AND p.id IN (${scope.map(() => "?").join(",")})` : "";
    const rows = await queryRaw<{ name: string; cnt: number | bigint }[]>(
      `SELECT area_name AS name, COUNT(DISTINCT project_id) AS cnt
       FROM (
         SELECT p.id AS project_id, loc.name AS area_name
         FROM projects p
         INNER JOIN areas loc ON loc.id = p.area
         WHERE p.is_archive = 0 AND p.status = 1 AND loc.name IS NOT NULL AND loc.name != ''
         ${scopeSql}
         UNION
         SELECT p.id AS project_id, linked.name AS area_name
         FROM projects p
         INNER JOIN project_area pa ON pa.project_id = p.id
         INNER JOIN areas linked ON linked.id = pa.area_id
         WHERE p.is_archive = 0 AND p.status = 1 AND linked.name IS NOT NULL AND linked.name != ''
         ${scopeSql}
       ) grouped
       GROUP BY area_name
       ORDER BY cnt DESC
       LIMIT ?`,
      ...(scope ?? []),
      ...(scope ?? []),
      limit
    );

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.name] = Number(row.cnt);
    }
    return counts;
  } catch {
    return {};
  }
}

export async function getAreaProjectCounts(
  viewerUserId?: number | null,
  scope?: number[] | null
): Promise<Record<string, number>> {
  const resolvedScope = scope ?? (await resolveHomeScope(viewerUserId));
  const counts: Record<string, number> = {};

  // Sequential — avoids exhausting the small MariaDB pool on the home page.
  for (const place of popularPlaces) {
    counts[place.name] = await countProjectsForPlace(
      place.query,
      place.name,
      resolvedScope
    );
  }

  const configuredTotal = Object.values(counts).reduce((sum, n) => sum + n, 0);
  if (configuredTotal > 0) return counts;

  const breakdown = await getListingAreaBreakdown(8, resolvedScope);
  for (const [name, count] of Object.entries(breakdown)) {
    const popularMatch = popularPlaces.find(
      (place) => areaTokensMatch(place.query, name) || areaTokensMatch(place.name, name)
    );
    if (popularMatch) {
      counts[popularMatch.name] = (counts[popularMatch.name] ?? 0) + count;
    }
  }

  const remappedTotal = Object.values(counts).reduce((sum, n) => sum + n, 0);
  if (remappedTotal > 0) return counts;

  return breakdown;
}

export async function getHomePageData(viewerUserId?: number | null): Promise<{
  featured: ProjectListItem[];
}> {
  const scope = await resolveHomeScope(viewerUserId);
  if (scope != null && !scope.length) return { featured: [] };

  // Only the 8 featured cards need project data here. The map loads its own pins from
  // /api/v1/projects/map-data, so embedding a 200-project list only bloated the HTML (~290KB).
  // Most visitors share the public list, so reuse the 2-minute listings cache (same as /projects);
  // team members limited to a project scope keep a live, scoped query.
  const query = { perPage: 8, page: 1, ...filtersFromScope(scope) };
  const { items } = scope === undefined ? await listProjectsCached(query) : await listProjects(query);
  return { featured: items };
}
