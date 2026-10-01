import { NextRequest, NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import type { ProjectApprovalAction } from "@/config/project-status";
import { setProjectApprovalStatus } from "@/server/services/admin-project.service";

const ACTIONS = new Set<ProjectApprovalAction>(["approve", "hold", "reject"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isFinite(projectId) || projectId <= 0) {
    return NextResponse.json({ success: false, message: "Invalid project id" }, { status: 400 });
  }

  const body = (await request.json()) as { action?: string };
  const action = body.action as ProjectApprovalAction;
  if (!action || !ACTIONS.has(action)) {
    return NextResponse.json(
      { success: false, message: "action must be approve, hold, or reject" },
      { status: 400 }
    );
  }

  const result = await setProjectApprovalStatus(projectId, action);
  if (!result.success) {
    return NextResponse.json(
      { success: false, message: result.error ?? "Update failed" },
      { status: 400 }
    );
  }
  return NextResponse.json({ success: true });
}
