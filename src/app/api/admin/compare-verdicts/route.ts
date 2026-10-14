import { NextRequest, NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { requireModulePermission } from "@/lib/admin-api-permissions";
import { isDatabaseEnabled } from "@/lib/db";
import type { PermissionAction } from "@/config/admin-permissions";
import {
  STORED_WINNERS,
  VERDICT_KINDS,
  VerdictTableMissingError,
  deleteVerdict,
  listVerdicts,
  updateVerdict,
  type StoredWinner,
  type VerdictKind,
} from "@/server/services/compare-verdict.service";

const PER_PAGE = 50;

async function authorize(action: PermissionAction) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;
  const denied = await requireModulePermission(auth.session, "compare_verdicts", action);
  return denied ?? auth;
}

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

function handleError(e: unknown) {
  if (e instanceof VerdictTableMissingError) return fail(e.message, 503);
  console.error("[admin/compare-verdicts]", e);
  return fail("Something went wrong", 500);
}

export async function GET(request: NextRequest) {
  const auth = await authorize("view");
  if (auth instanceof NextResponse) return auth;
  if (!isDatabaseEnabled()) return fail("Database is not enabled", 503);

  const sp = request.nextUrl.searchParams;
  const kind = sp.get("kind");
  const page = Math.max(1, Number(sp.get("page")) || 1);
  try {
    const result = await listVerdicts({
      kind: VERDICT_KINDS.includes(kind as VerdictKind) ? (kind as VerdictKind) : undefined,
      q: sp.get("q")?.slice(0, 100),
      page,
      perPage: PER_PAGE,
    });
    return NextResponse.json({ success: true, ...result, page, perPage: PER_PAGE });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authorize("edit");
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => ({}))) as { id?: unknown; winner?: unknown; reason?: unknown };
  const id = Number(body.id);
  const winner = String(body.winner ?? "") as StoredWinner;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!Number.isInteger(id) || id <= 0) return fail("id required", 400);
  if (!STORED_WINNERS.includes(winner)) return fail("Pick a winner", 400);
  if (!reason) return fail("Reason required", 400);

  try {
    const found = await updateVerdict(id, winner, reason);
    return found ? NextResponse.json({ success: true }) : fail("Verdict not found", 404);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await authorize("delete");
  if (auth instanceof NextResponse) return auth;

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return fail("id required", 400);
  try {
    const found = await deleteVerdict(id);
    return found ? NextResponse.json({ success: true }) : fail("Verdict not found", 404);
  } catch (e) {
    return handleError(e);
  }
}
