import { NextRequest, NextResponse } from "next/server";
import { requireAdminUnitAccess } from "@/lib/admin-api-guard";
import {
  createUnitRoom,
  createUnitRooms,
  type UnitRoomPayload,
} from "@/server/services/admin-unit.service";

type Ctx = { params: Promise<{ id: string }> };

const MAX_ROOMS_PER_REQUEST = 60;

function toPayload(body: Record<string, unknown>): UnitRoomPayload {
  return {
    roomTypeId: Number(body.roomTypeId),
    widthFeet: Number(body.widthFeet ?? 0),
    widthInches: Number(body.widthInches ?? 0),
    lengthFeet: Number(body.lengthFeet ?? 0),
    lengthInches: Number(body.lengthInches ?? 0),
    coveredArea: body.coveredArea != null ? Number(body.coveredArea) : null,
    extras: body.extras != null ? String(body.extras) : "1",
  };
}

function isValidRoom(room: UnitRoomPayload): boolean {
  const whole = [room.widthFeet, room.widthInches, room.lengthFeet, room.lengthInches];
  return (
    Number.isInteger(room.roomTypeId) &&
    room.roomTypeId > 0 &&
    whole.every((n) => Number.isInteger(n) && n >= 0) &&
    room.widthInches < 12 &&
    room.lengthInches < 12
  );
}

/** Body: one room, or `{ rooms: [...] }` to add several at once. */
export async function POST(request: NextRequest, { params }: Ctx) {
  const unitId = Number((await params).id);
  const auth = await requireAdminUnitAccess(unitId);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
  }

  if (Array.isArray(body.rooms)) {
    const rooms = (body.rooms as Record<string, unknown>[]).map(toPayload);
    if (!rooms.length || rooms.length > MAX_ROOMS_PER_REQUEST || !rooms.every(isValidRoom)) {
      return NextResponse.json(
        { success: false, message: "Every room needs a room type and whole-number sizes" },
        { status: 400 }
      );
    }
    const result = await createUnitRooms(unitId, rooms);
    if (!result.ok) {
      return NextResponse.json({ success: false, message: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, count: result.count });
  }

  const result = await createUnitRoom(unitId, toPayload(body));

  if (!result.ok) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, id: result.id });
}
