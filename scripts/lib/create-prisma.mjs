import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";

function poolSize() {
  const n = Number(process.env.DATABASE_POOL_SIZE ?? 2);
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), 3) : 2;
}

function mysqlAdapterFromUrl(databaseUrl) {
  const url = new URL(databaseUrl);
  return new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: poolSize(),
  });
}

/** Prisma engineType=client requires a driver adapter for every PrismaClient. */
export function createPrismaClient({ url = process.env.DATABASE_URL } = {}) {
  if (url?.includes("mysql")) {
    return new PrismaClient({ adapter: mysqlAdapterFromUrl(url) });
  }
  throw new Error("DATABASE_URL (mysql) is required for Prisma Client");
}
