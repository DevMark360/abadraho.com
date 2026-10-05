import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { mysqlPoolConfigFromUrl } from "@/lib/db-pool";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient(): PrismaClient {
  const log = process.env.USE_DATABASE === "true" ? (["error"] as const) : [];
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl?.includes("mysql")) {
    const adapter = new PrismaMariaDb(mysqlPoolConfigFromUrl(databaseUrl));
    return new PrismaClient({ adapter, log: [...log] });
  }

  throw new Error("DATABASE_URL (mysql) is required for Prisma Client");
}

// Always reuse one client + pool per Node worker (critical on cPanel / Passenger).
function getPrismaClient(): PrismaClient {
  globalForPrisma.prisma ??= createPrismaClient();
  return globalForPrisma.prisma;
}

/**
 * Created on first use, not at import: `next build` imports every route while collecting page
 * data, and must not need DATABASE_URL just for that. A missing URL still throws on the first query.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
