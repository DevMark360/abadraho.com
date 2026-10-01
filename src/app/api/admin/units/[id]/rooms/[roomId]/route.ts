import { NextRequest, NextResponse } from "next/server";
import { requireAdminUnitAccess } from "@/lib/admin-api-guard";
import { archiveUnitRoom, updateUnitRoom } from "@/server/services/admin-unit.service";

type Ctx = { params: Promise<{ id: string; roomId: string }> };

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const { id, roomId: roomIdParam } = await params;
  const auth = await requireAdminUnitAccess(Number(id));
  if (auth instanceof NextResponse) return auth;

  const roomId = Number(roomIdParam);
  const body = await request.json();

  const result = await updateUnitRoom(roomId, {
    roomTypeId: Number(body.roomTypeId),
    widthFeet: Number(body.widthFeet ?? 0),
    widthInches: Number(body.widthInches ?? 0),
    lengthFeet: Number(body.lengthFeet ?? 0),
    lengthInches: Number(body.lengthInches ?? 0),
    coveredArea: body.coveredArea != null ? Number(body.coveredArea) : null,
    extras: body.extras != null ? String(body.extras) : "1",
  });

  if (!result.ok) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const { id, roomId: roomIdParam } = await params;
  const auth = await requireAdminUnitAccess(Number(id));
  if (auth instanceof NextResponse) return auth;

  const roomId = Number(roomIdParam);
  await archiveUnitRoom(roomId);
  return NextResponse.json({ success: true });
}
