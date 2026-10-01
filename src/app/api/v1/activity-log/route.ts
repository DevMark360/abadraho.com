import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { clientIp } from "@/lib/rate-limit";
import { isTrackableVisitorRole } from "@/lib/roles";
import { createCustomActivityLog } from "@/server/services/activity-log-client.service";

function activityProperties(body: Record<string, unknown>): Record<string, unknown> {
  const { user_id: _uid, userId: _userId, ...rest } = body;
  return rest;
}

/** Legacy: POST /create/custom-activity-log — authenticated users only (sec-8). */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  // Staff/builder/agent traffic isn't real visitor behavior — accept the request but skip storage.
  if (!isTrackableVisitorRole(session.role)) {
    return NextResponse.json({ success: true, skipped: true });
  }

  const body = await request.json();

  const description =
    body.description ?? body.message ?? body.log_description ?? "Activity";
  if (!description || typeof description !== "string") {
    return NextResponse.json({ success: false, message: "description required" }, { status: 422 });
  }

  const result = await createCustomActivityLog({
    logName: body.log_name ?? body.logName,
    description,
    conversionId: body.conversion_id != null ? Number(body.conversion_id) : undefined,
    objective: body.objective,
    subjectType: body.subject_type ?? body.subjectType,
    subjectId: body.subject_id != null ? Number(body.subject_id) : undefined,
    logTable: body.log_table ?? body.logTable,
    pageUrl: body.page_url ?? body.path ?? body.pageUrl,
    durationInSecond:
      body.duration_in_second != null ? Number(body.duration_in_second) : undefined,
    properties: typeof body === "object" ? activityProperties(body) : undefined,
    userId: session.id,
    ip: clientIp(request) === "unknown" ? null : clientIp(request),
  });

  return NextResponse.json({
    status: result.success,
    success: result.success,
    message: result.success ? "Activity Log inserted successfully." : "Failed",
    data: result.id ? { id: result.id } : null,
  });
}
