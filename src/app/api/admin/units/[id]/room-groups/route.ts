import { NextRequest, NextResponse } from "next/server";
import { requireAdminUnitAccess } from "@/lib/admin-api-guard";
import { RoomGroupError, clearRoomGroups, createRoomGroup } from "@/server/services/unit-room-group.service";

type Ctx = { params: Promise<{ id: string }> };

function fail(e: unknown) {
  if (e instanceof RoomGroupError) return NextResponse.json({ success: false, message: e.message }, { status: 400 });
  console.error("[admin/room-groups]", e);
  return NextResponse.json({ success: false, message: "Something went wrong" }, { status: 500 });
}

/** POST { name }: adds a room group (a layout / floor) to the unit. */
export async function POST(request: NextRequest, { params }: Ctx) {
  const unitId = Number((await params).id);
  const auth = await requireAdminUnitAccess(unitId, "edit");
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => ({}))) as { name?: unknown };
  try {
    const group = await createRoomGroup(unitId, body.name);
    return NextResponse.json({ success: true, group });
  } catch (e) {
    return fail(e);
  }
}

/** DELETE: removes every group of the unit ("more than one layout" turned off); rooms are kept. */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const unitId = Number((await params).id);
  const auth = await requireAdminUnitAccess(unitId, "edit");
  if (auth instanceof NextResponse) return auth;

  try {
    await clearRoomGroups(unitId);
    return NextResponse.json({ success: true });
  } catch (e) {
    return fail(e);
  }
}
