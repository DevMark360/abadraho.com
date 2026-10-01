import { queryRaw } from "@/lib/prisma-raw";
import { isDatabaseEnabled } from "@/lib/db";
import { listProjects } from "@/server/services/project.service";
import type { ProjectListItem } from "@/types/project";

export interface AreaInfo {
  id: number;
  name: string;
  slug: string;
  /** Defaults to "Karachi" for areas without a city assigned yet (legacy data). */
  cityName?: string;
}

/** Convert "Scheme 33" → "scheme-33" */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Fetch all live areas that have at least one active project. */
export async function listAreasWithProjects(): Promise<AreaInfo[]> {
  if (!isDatabaseEnabled()) return [];
  try {
    const rows = await queryRaw<{ id: number | bigint; name: string }[]>(
      `SELECT DISTINCT a.id, a.name
       FROM areas a
       INNER JOIN project_area pa ON pa.area_id = a.id
       INNER JOIN projects p ON p.id = pa.project_id
       WHERE p.is_archive = 0 AND p.status = 1
       ORDER BY a.name ASC`
    );
    return rows
      .filter((r) => r.name?.trim())
      .map((r) => ({
        id: Number(r.id),
        name: r.name.trim(),
        slug: nameToSlug(r.name.trim()),
      }));
  } catch {
    return [];
  }
}

export interface AreaPageData {
  area: AreaInfo;
  projects: ProjectListItem[];
  total: number;
}

/** Fetch area + its projects by slug. Returns null if not found. */
export async function getAreaPageData(
  slug: string,
  viewerUserId?: number | null
): Promise<AreaPageData | null> {
  if (!isDatabaseEnabled()) return null;

  try {
    // Fetch all areas and find one whose name matches this slug
    const rows = await queryRaw<{ id: number | bigint; name: string; city_name: string | null }[]>(
      `SELECT a.id, a.name, c.name AS city_name
       FROM areas a
       LEFT JOIN cities c ON c.id = a.city_id
       ORDER BY a.name ASC`
    );

    const match = rows.find((r) => nameToSlug(r.name?.trim() ?? "") === slug);
    if (!match) return null;

    const areaId = Number(match.id);
    const areaInfo: AreaInfo = {
      id: areaId,
      name: match.name.trim(),
      slug,
      cityName: match.city_name?.trim() || "Karachi",
    };

    const { items, total } = await listProjects({
      areaIds: [areaId],
      perPage: 100,
      page: 1,
      ...(viewerUserId ? { viewerUserId } : {}),
    });

    return { area: areaInfo, projects: items, total };
  } catch {
    return null;
  }
}
