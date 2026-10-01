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

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Always reuse one client + pool per Node worker (critical on cPanel / Passenger).
globalForPrisma.prisma = prisma;
