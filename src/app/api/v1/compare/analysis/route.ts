import { NextRequest, NextResponse } from "next/server";
import { isDatabaseEnabled } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";
import { GroqError } from "@/server/groq-client";
import {
  CompareAnalysisInputError,
  analyzeUnits,
  isAnalysisCached,
  loadUnitSpecs,
} from "@/server/services/compare-analysis.service";
import { BUYER_PURPOSES, type BuyerPurpose } from "@/server/services/compare-verdict.service";

/** Fresh Groq analyses per signed-in user; repeats of a cached answer don't count. */
const HOURLY_MAX = 20;
const HOUR_MS = 60 * 60_000;

function fail(message: string, status: number, retryAfterSec?: number) {
  return NextResponse.json(
    { success: false, message },
    { status, headers: retryAfterSec ? { "Retry-After": String(retryAfterSec) } : undefined }
  );
}

/** Visitor-facing wording; setup details (missing key, model) only go to the server log. */
function groqFailure(e: GroqError) {
  console.warn("[compare/analysis]", e.code, e.message);
  if (e.code === "rate_limit") return fail("Too many analyses right now. Try again in a minute.", 429);
  if (e.code === "timeout" || e.code === "network") return fail("The analysis took too long. Try again.", 504);
  return fail("The AI analysis is not available right now.", 503);
}

const twoIds = (value: unknown): [number, number] | null => {
  const ids = Array.isArray(value) ? value.map(Number) : [];
  return ids.length === 2 && ids.every((id) => Number.isInteger(id) && id > 0) ? [ids[0], ids[1]] : null;
};

/**
 * POST { projectIds: [a, b], unitIds: [x, y], purpose }: an AI comparison of the two units for
 * the "Which unit wins?" button. The unit figures are read from the database here.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return fail("Sign in required", 401);
  if (!isDatabaseEnabled()) return fail("The AI analysis is not available right now.", 503);

  const body = (await request.json().catch(() => ({}))) as {
    projectIds?: unknown;
    unitIds?: unknown;
    purpose?: unknown;
  };
  const projectIds = twoIds(body.projectIds);
  const unitIds = twoIds(body.unitIds);
  if (!projectIds || !unitIds || unitIds[0] === unitIds[1]) return fail("Two units required", 400);
  const purpose: BuyerPurpose = BUYER_PURPOSES.includes(body.purpose as BuyerPurpose)
    ? (body.purpose as BuyerPurpose)
    : "living";

  try {
    const specs = await loadUnitSpecs(projectIds, unitIds);
    if (!isAnalysisCached(specs, purpose)) {
      const limit = checkRateLimit(`compare-analysis:${session.id}`, HOURLY_MAX, HOUR_MS);
      if (!limit.allowed) {
        return fail("You have reached the hourly limit for AI analyses. Try again later.", 429, limit.retryAfterSec);
      }
    }
    const analysis = await analyzeUnits(specs, purpose);
    return NextResponse.json({ success: true, analysis });
  } catch (e) {
    if (e instanceof CompareAnalysisInputError) return fail(e.message, 404);
    if (e instanceof GroqError) return groqFailure(e);
    console.error("[compare/analysis]", e);
    return fail("The AI analysis could not be prepared. Try again.", 502);
  }
}
