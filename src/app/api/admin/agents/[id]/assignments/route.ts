import { NextRequest, NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import {
  assignProjectToBroker,
  assignProjectsBulk,
  listBrokerAssignments,
  removeAssignment,
  resolveActiveProjectIds,
  updateAssignment,
} from "@/server/services/broker-agent-ops.service";
import type { CommissionType } from "@/config/broker-agent";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const brokerId = Number(id);
  if (!Number.isFinite(brokerId)) {
    return NextResponse.json({ success: false, message: "Invalid agent id" }, { status: 400 });
  }
  const items = await listBrokerAssignments(brokerId, { activeOnly: false });
  return NextResponse.json({ success: true, items });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const brokerId = Number(id);
  if (!Number.isFinite(brokerId)) {
    return NextResponse.json({ success: false, message: "Invalid agent id" }, { status: 400 });
  }

  const body = await req.json();
  const commissionType = (body.commissionType === "fixed" ? "fixed" : "percentage") as CommissionType;
  const commissionValue = Number(body.commissionValue ?? 0);
  const notes = body.notes != null ? String(body.notes) : null;
  const mode = String(body.mode ?? "project");

  try {
    if (mode === "area" && body.areaId) {
      const projectIds = await resolveActiveProjectIds({ areaId: Number(body.areaId) });
      const count = await assignProjectsBulk({
        brokerId,
        projectIds,
        commissionType,
        commissionValue,
        notes,
      });
      return NextResponse.json({ success: true, assigned: count });
    }
    if (mode === "builder" && body.builderId) {
      const projectIds = await resolveActiveProjectIds({ builderId: Number(body.builderId) });
      const count = await assignProjectsBulk({
        brokerId,
        projectIds,
        commissionType,
        commissionValue,
        notes,
      });
      return NextResponse.json({ success: true, assigned: count });
    }

    const projectId = Number(body.projectId);
    if (!Number.isFinite(projectId)) {
      return NextResponse.json({ success: false, message: "Project required" }, { status: 400 });
    }
    await assignProjectToBroker({
      brokerId,
      projectId,
      commissionType,
      commissionValue,
      notes,
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { success: false, message: e instanceof Error ? e.message : "Assign failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const brokerId = Number(id);
  const body = await req.json();
  const assignmentId = Number(body.assignmentId);
  if (!Number.isFinite(assignmentId)) {
    return NextResponse.json({ success: false, message: "assignmentId required" }, { status: 400 });
  }
  await updateAssignment(assignmentId, brokerId, {
    commissionType: body.commissionType,
    commissionValue: body.commissionValue != null ? Number(body.commissionValue) : undefined,
    notes: body.notes,
    isActive: body.isActive,
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;
  const brokerId = Number(id);
  const assignmentId = Number(new URL(req.url).searchParams.get("assignmentId"));
  if (!Number.isFinite(assignmentId)) {
    return NextResponse.json({ success: false, message: "assignmentId required" }, { status: 400 });
  }
  await removeAssignment(assignmentId, brokerId);
  return NextResponse.json({ success: true });
}
