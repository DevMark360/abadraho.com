import { isDatabaseEnabled } from "@/lib/db";
import { queryRaw } from "@/lib/prisma-raw";
import { prisma } from "@/lib/prisma";

export const MAX_USER_COMPARE = 2;

export interface UserCompareEntry {
  projectId: number;
  slug: string;
  unitId: number | null;
  slot: number;
}

export interface CompareEntryInput {
  projectId: number;
  unitId?: number | null;
}

type CompareRow = {
  project_id: number | bigint;
  unit_id: number | bigint | null;
  slot: number | bigint;
  slug: string;
  is_archive: number | boolean;
};

function toNum(v: number | bigint | null | undefined): number | null {
  if (v == null) return null;
  return typeof v === "bigint" ? Number(v) : v;
}

function mapCompareRows(rows: CompareRow[]): UserCompareEntry[] {
  return rows
    .filter((r) => !r.is_archive)
    .map((r) => ({
      projectId: Number(r.project_id),
      slug: r.slug,
      unitId: toNum(r.unit_id),
      slot: Number(r.slot),
    }));
}

async function projectExists(projectId: number): Promise<boolean> {
  const rows = await queryRaw<{ id: number | bigint }[]>(
    "SELECT id FROM projects WHERE id = ? AND is_archive = 0 LIMIT 1",
    projectId
  );
  return rows.length > 0;
}

/** Raw SQL — works without `prisma.userCompare` (cPanel often cannot run prisma generate). */
export async function getUserCompareEntries(userId: number): Promise<UserCompareEntry[]> {
  if (!isDatabaseEnabled()) return [];
  try {
    const rows = await queryRaw<CompareRow[]>(
      `SELECT uc.project_id, uc.unit_id, uc.slot, p.slug, p.is_archive
       FROM user_compares uc
       INNER JOIN projects p ON p.id = uc.project_id
       WHERE uc.user_id = ?
       ORDER BY uc.slot ASC`,
      userId
    );
    return mapCompareRows(rows);
  } catch (err) {
    console.error("[user-compare/get]", err);
    return [];
  }
}

export async function saveUserCompareList(
  userId: number,
  entries: CompareEntryInput[]
): Promise<UserCompareEntry[]> {
  if (!isDatabaseEnabled()) throw new Error("Database disabled");

  const unique: CompareEntryInput[] = [];
  const seen = new Set<number>();
  for (const entry of entries) {
    const id = Number(entry.projectId);
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    unique.push({ projectId: id, unitId: entry.unitId ?? null });
    if (unique.length >= MAX_USER_COMPARE) break;
  }

  const valid: CompareEntryInput[] = [];
  for (const entry of unique) {
    if (await projectExists(entry.projectId)) valid.push(entry);
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`DELETE FROM user_compares WHERE user_id = ${userId}`;
    for (let slot = 0; slot < valid.length; slot++) {
      const entry = valid[slot];
      await tx.$executeRaw`
        INSERT INTO user_compares (user_id, project_id, unit_id, slot, created_at, updated_at)
        VALUES (${userId}, ${entry.projectId}, ${entry.unitId}, ${slot}, NOW(3), NOW(3))
      `;
    }
  });

  return getUserCompareEntries(userId);
}

export async function syncCompareFromLocal(
  userId: number,
  localEntries: CompareEntryInput[]
): Promise<number> {
  if (!isDatabaseEnabled()) return 0;

  const server = await getUserCompareEntries(userId);
  const merged: CompareEntryInput[] = [];
  const seen = new Set<number>();

  for (const entry of server) {
    if (merged.length >= MAX_USER_COMPARE) break;
    merged.push({ projectId: entry.projectId, unitId: entry.unitId });
    seen.add(entry.projectId);
  }

  for (const entry of localEntries) {
    if (merged.length >= MAX_USER_COMPARE) break;
    const id = Number(entry.projectId);
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) continue;
    merged.push({ projectId: id, unitId: entry.unitId ?? null });
    seen.add(id);
  }

  if (merged.length === server.length && server.length > 0) {
    return 0;
  }

  const before = server.length;
  await saveUserCompareList(userId, merged);
  return Math.max(0, merged.length - before);
}
