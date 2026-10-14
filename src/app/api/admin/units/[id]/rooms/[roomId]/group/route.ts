import { NextRequest, NextResponse } from "next/server";
import { requireAdminUnitAccess } from "@/lib/admin-api-guard";
import { RoomGroupError, assignRoomGroup } from "@/server/services/unit-room-group.service";

type Ctx = { params: Promise<{ id: string; roomId: string }> };

/** PUT { groupId }: moves the room into that group; `groupId: null` takes it out of any group. */
export async function PUT(request: NextRequest, { params }: Ctx) {
  const { id, roomId } = await params;
  const unitId = Number(id);
  const auth = await requireAdminUnitAccess(unitId, "edit");
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => ({}))) as { groupId?: unknown };
  const groupId = body.groupId == null || body.groupId === "" ? null : Number(body.groupId);
  if (groupId !== null && (!Number.isInteger(groupId) || groupId <= 0)) {
    return NextResponse.json({ success: false, message: "Invalid group" }, { status: 400 });
  }
  try {
    await assignRoomGroup(unitId, Number(roomId), groupId);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof RoomGroupError) {
      return NextResponse.json({ success: false, message: e.message }, { status: 400 });
    }
    console.error("[admin/room-group assign]", e);
    return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
  }
}
