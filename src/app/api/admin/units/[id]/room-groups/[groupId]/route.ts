import { NextRequest, NextResponse } from "next/server";
import { requireAdminUnitAccess } from "@/lib/admin-api-guard";
import {
  RoomGroupError,
  deleteRoomGroup,
  moveRoomGroup,
  renameRoomGroup,
} from "@/server/services/unit-room-group.service";

type Ctx = { params: Promise<{ id: string; groupId: string }> };

function fail(e: unknown) {
  if (e instanceof RoomGroupError) return NextResponse.json({ success: false, message: e.message }, { status: 400 });
  console.error("[admin/room-groups]", e);
  return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
}

/** PATCH { name } renames the group; PATCH { move: "up" | "down" } changes its place. */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id, groupId } = await params;
  const unitId = Number(id);
  const auth = await requireAdminUnitAccess(unitId, "edit");
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => ({}))) as { name?: unknown; move?: unknown };
  try {
    if (body.move === "up" || body.move === "down") {
      await moveRoomGroup(unitId, Number(groupId), body.move);
    } else {
      await renameRoomGroup(unitId, Number(groupId), body.name);
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    return fail(e);
  }
}

/** DELETE: removes the group; its rooms stay on the unit without a group. */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const { id, groupId } = await params;
  const unitId = Number(id);
  const auth = await requireAdminUnitAccess(unitId, "edit");
  if (auth instanceof NextResponse) return auth;

  try {
    await deleteRoomGroup(unitId, Number(groupId));
    return NextResponse.json({ success: true });
  } catch (e) {
    return fail(e);
  }
}
