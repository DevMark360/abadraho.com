import { NextRequest, NextResponse } from "next/server";
import { classifyCompareDbError } from "@/lib/compare-db-error";
import { getSession } from "@/lib/session";
import {
  getUserCompareEntries,
  syncCompareFromLocal,
} from "@/server/services/user-compare.service";

/** Merge localStorage compare list into DB after login */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Sign in required" }, { status: 401 });
  }

  let body: { entries?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }

  const raw = Array.isArray(body.entries) ? body.entries : [];
  const entries = raw
    .map((e: { id?: unknown; projectId?: unknown; unitId?: unknown }) => ({
      projectId: Number(e.projectId ?? e.id),
      unitId: e.unitId != null ? Number(e.unitId) : null,
    }))
    .filter((e: { projectId: number }) => Number.isFinite(e.projectId) && e.projectId > 0);

  try {
    const added = await syncCompareFromLocal(session.id, entries);
    const saved = await getUserCompareEntries(session.id);
    return NextResponse.json({ success: true, added, entries: saved });
  } catch (err) {
    console.error("[compare/sync]", err);
    const { code, hint } = classifyCompareDbError(err);
    return NextResponse.json(
      {
        success: false,
        code,
        message: "Compare sync failed — using local compare only.",
        hint,
      },
      { status: 503 }
    );
  }
}
