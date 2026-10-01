import { NextRequest, NextResponse } from "next/server";
import {
  healthCheckDeniedResponse,
  isHealthCheckAuthorized,
  readHealthCheckToken,
} from "@/lib/health-auth";
import { runFoundationCheck } from "@/server/services/foundation.service";

/** Phase 0 foundation status — DB counts + v2 API reachability (auth required in production). */
export async function GET(request: NextRequest) {
  if (!isHealthCheckAuthorized(request)) {
    return healthCheckDeniedResponse();
  }

  const report = await runFoundationCheck({
    healthAuthToken: readHealthCheckToken(request),
  });
  return NextResponse.json(report, {
    status: report.passed ? 200 : 503,
  });
}
