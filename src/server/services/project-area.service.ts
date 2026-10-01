import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { prisma } from "@/lib/prisma";

function toIntIds(values: Array<number | bigint | string | null | undefined>): number[] {
  return values
    .map((v) => (typeof v === "bigint" ? Number(v) : Number(v)))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/** Comma-separated area names from `project_area` junction. */
export async function loadAreaNamesByProjectIds(
  projectIds: number[]
): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (!projectIds.length) return map;
  const placeholders = projectIds.map(() => "?").join(",");
  const rows = await queryRaw<{ project_id: number | bigint; name: string }[]>(
    `SELECT pa.project_id, a.name FROM project_area pa INNER JOIN areas a ON a.id = pa.area_id WHERE pa.project_id IN (${placeholders})`,
    ...projectIds
  );
  for (const row of rows) {
    const pid = Number(row.project_id);
    const prev = map.get(pid);
    map.set(pid, prev ? `${prev}, ${row.name}` : row.name);
  }
  return map;
}

/** Area IDs per project from `project_area` junction. */
export async function loadAreaIdsByProjectIds(
  projectIds: number[]
): Promise<Map<number, number[]>> {
  const map = new Map<number, number[]>();
  if (!projectIds.length) return map;
  const placeholders = projectIds.map(() => "?").join(",");
  const rows = await queryRaw<{ project_id: number | bigint; area_id: number | bigint }[]>(
    `SELECT project_id, area_id FROM project_area WHERE project_id IN (${placeholders})`,
    ...projectIds
  );
  for (const row of rows) {
    const pid = Number(row.project_id);
    const aid = Number(row.area_id);
    const list = map.get(pid) ?? [];
    list.push(aid);
    map.set(pid, list);
  }
  return map;
}

export async function projectIdsMatchingAreas(areaIds: number[]): Promise<number[]> {
  if (!areaIds.length) return [];
  const placeholders = areaIds.map(() => "?").join(",");
  const rows = await queryRaw<{ project_id: number | bigint }[]>(
    `SELECT DISTINCT project_id FROM project_area WHERE area_id IN (${placeholders})`,
    ...areaIds
  );
  return [...new Set(toIntIds(rows.map((r) => r.project_id)))];
}

export async function projectIdsMatchingCities(cityIds: number[]): Promise<number[]> {
  if (!cityIds.length) return [];
  const placeholders = cityIds.map(() => "?").join(",");
  const rows = await queryRaw<{ project_id: number | bigint }[]>(
    `SELECT DISTINCT pa.project_id FROM project_area pa
     INNER JOIN areas a ON a.id = pa.area_id
     WHERE a.city_id IN (${placeholders})`,
    ...cityIds
  );
  return [...new Set(toIntIds(rows.map((r) => r.project_id)))];
}

export { toIntIds };
