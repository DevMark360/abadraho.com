import { NextRequest, NextResponse } from "next/server";
import { classifyCompareDbError } from "@/lib/compare-db-error";
import { tableExists } from "@/lib/db-table-exists";
import { isDatabaseEnabled } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { saveUserCompareList } from "@/server/services/user-compare.service";

/** Logged-in: check DB + user_compares table (diagnostic). */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Sign in required" }, { status: 401 });
  }

  const dbEnabled = isDatabaseEnabled();
  let tableOk = false;
  let tableError: string | null = null;

  if (dbEnabled) {
    try {
      tableOk = await tableExists("user_compares");
      if (tableOk) {
        await prisma.$queryRaw`SELECT 1 FROM user_compares LIMIT 1`;
      }
    } catch (err) {
      tableError = err instanceof Error ? err.message : String(err);
      tableOk = false;
    }
  }

  return NextResponse.json({
    success: true,
    dbEnabled,
    tableOk,
    tableError,
    storage: "raw-sql",
    database: process.env.DATABASE_URL?.replace(/:[^:@/]+@/, ":***@").split("/").pop() ?? null,
    hint: !dbEnabled
      ? "USE_DATABASE is not true."
      : !tableOk
        ? "Create user_compares (scripts/create-user-compares.sql)."
        : "Ready.",
  });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Sign in required" }, { status: 401 });
  }

  const body = await request.json();
  const raw = Array.isArray(body.entries) ? body.entries : [];
  const entries = raw
    .map((e: { projectId?: unknown; unitId?: unknown }) => ({
      projectId: Number(e.projectId),
      unitId: e.unitId != null ? Number(e.unitId) : null,
    }))
    .filter((e: { projectId: number }) => Number.isFinite(e.projectId) && e.projectId > 0);

  try {
    const saved = await saveUserCompareList(session.id, entries);
    return NextResponse.json({ success: true, entries: saved });
  } catch (err) {
    console.error("[compare/PUT]", err);
    const { code, hint } = classifyCompareDbError(err);
    return NextResponse.json(
      {
        success: false,
        code,
        message: "Database unavailable, using local compare",
        hint,
      },
      { status: 503 }
    );
  }
}
