/** Shared MariaDB pool settings — one pool per Node process (see prisma.ts singleton). */

const DEFAULT_POOL_SIZE = process.env.NODE_ENV === "production" ? 2 : 5;
const MAX_POOL_SIZE = process.env.NODE_ENV === "production" ? 3 : 10;

export function getDatabasePoolSize(): number {
  const raw = process.env.DATABASE_POOL_SIZE;
  if (raw == null || raw === "") return DEFAULT_POOL_SIZE;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_POOL_SIZE;
  return Math.min(Math.floor(n), MAX_POOL_SIZE);
}

export type MysqlPoolConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  /** Fail fast when MySQL is stopped (default mariadb driver ~10s acquire wait). */
  connectTimeout?: number;
  acquireTimeout?: number;
};

export function mysqlPoolConfigFromUrl(databaseUrl: string): MysqlPoolConfig {
  const url = new URL(databaseUrl);
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: getDatabasePoolSize(),
    connectTimeout: 5_000,
    acquireTimeout: 15_000,
  };
}
