import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Build a parameterized Prisma.sql from `?` placeholders (values are bound, not interpolated).
 * SQL structure must come from application code; only `params` are user-derived.
 */
export function prismaSql(sql: string, ...params: unknown[]): Prisma.Sql {
  const parts = sql.split("?");
  if (parts.length !== params.length + 1) {
    throw new Error(
      `SQL placeholder count mismatch: ${parts.length - 1} placeholders, ${params.length} params`
    );
  }

  let built = Prisma.sql`${Prisma.raw(parts[0]!)}`;
  for (let i = 0; i < params.length; i++) {
    built = Prisma.sql`${built}${params[i]}${Prisma.raw(parts[i + 1]!)}`;
  }
  return built;
}

export function queryRaw<T>(sql: string, ...params: unknown[]): Promise<T> {
  return prisma.$queryRaw<T>(prismaSql(sql, ...params));
}

export function executeRaw(sql: string, ...params: unknown[]): Promise<number> {
  return prisma.$executeRaw(prismaSql(sql, ...params));
}
