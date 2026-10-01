import { NextRequest, NextResponse } from "next/server";
import { requireAdminUnitAccess } from "@/lib/admin-api-guard";
import { createUnitRoom } from "@/server/services/admin-unit.service";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  const unitId = Number((await params).id);
  const auth = await requireAdminUnitAccess(unitId);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();

  const result = await createUnitRoom(unitId, {
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
  return NextResponse.json({ success: true, id: result.id });
}
