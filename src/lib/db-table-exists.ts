import { prisma } from "@/lib/prisma";

const cache = new Map<string, boolean>();

export function clearTableExistsCache() {
  cache.clear();
}

/** Returns false when the table is not in the current MySQL schema. */
export async function tableExists(tableName: string): Promise<boolean> {
  const key = tableName.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  const rows = await prisma.$queryRaw<{ cnt: bigint }[]>`
    SELECT COUNT(*) AS cnt
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = ${tableName}
  `;
  const exists = Number(rows[0]?.cnt ?? 0) > 0;
  cache.set(key, exists);
  return exists;
}

/** Returns false when the column is not on the table in the current MySQL schema. */
export async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const key = `${tableName.toLowerCase()}.${columnName.toLowerCase()}`;
  if (cache.has(key)) return cache.get(key)!;

  const rows = await prisma.$queryRaw<{ cnt: bigint }[]>`
    SELECT COUNT(*) AS cnt
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = ${tableName}
      AND column_name = ${columnName}
  `;
  const exists = Number(rows[0]?.cnt ?? 0) > 0;
  cache.set(key, exists);
  return exists;
}
