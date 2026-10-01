/** Classify DB / Prisma errors for user-friendly compare API responses. */

export type CompareDbErrorCode =
  | "TABLE_MISSING"
  | "PRISMA_CLIENT_STALE"
  | "DATABASE_DISABLED"
  | "DB_ERROR";

export function classifyCompareDbError(err: unknown): {
  code: CompareDbErrorCode;
  hint: string;
} {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (
    lower.includes("table") &&
    (lower.includes("doesn't exist") ||
      lower.includes("does not exist") ||
      lower.includes("exist"))
  ) {
    return {
      code: "TABLE_MISSING",
      hint: "Run scripts/create-user-compares.sql on this database, or use local compare only.",
    };
  }

  if (
    lower.includes("cannot read properties of undefined") ||
    lower.includes("is not a function") ||
    (lower.includes("prisma") && lower.includes("undefined"))
  ) {
    return {
      code: "PRISMA_CLIENT_STALE",
      hint: "Prisma client is stale — run `npx prisma generate` and restart.",
    };
  }

  if (lower.includes("use_database") || lower.includes("database_url")) {
    return {
      code: "DATABASE_DISABLED",
      hint: "Set USE_DATABASE=true and DATABASE_URL in your .env.",
    };
  }

  return {
    code: "DB_ERROR",
    hint: msg,
  };
}
