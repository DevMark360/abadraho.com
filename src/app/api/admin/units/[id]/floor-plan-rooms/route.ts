import { NextRequest, NextResponse } from "next/server";
import { requireAdminUnitAccess } from "@/lib/admin-api-guard";
import { validateImageFile } from "@/lib/admin-file-upload";
import { buildRoomSuggestions } from "@/lib/floor-plan-rooms";
import { prisma } from "@/lib/prisma";
import { FloorPlanReadError, readFloorPlanRooms } from "@/server/floor-plan-reader";
import { readUnitFloorPlan } from "@/server/services/admin-unit-upload.service";

type Ctx = { params: Promise<{ id: string }> };

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

/** Reads rooms off a floor plan: the uploaded `file` (not saved yet) or the unit's saved one. */
export async function POST(request: NextRequest, { params }: Ctx) {
  const unitId = Number((await params).id);
  const auth = await requireAdminUnitAccess(unitId);
  if (auth instanceof NextResponse) return auth;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");

  let image: { data: Buffer; mime: string } | null;
  if (file instanceof File && file.size) {
    const check = validateImageFile(file);
    if (!check.ok) return fail(check.error, 400);
    image = { data: Buffer.from(await file.arrayBuffer()), mime: file.type || "image/jpeg" };
  } else {
    image = await readUnitFloorPlan(unitId);
  }
  if (!image) return fail("Upload a floor plan image first.", 404);

  try {
    const [readings, roomTypes] = await Promise.all([
      readFloorPlanRooms(image.data, image.mime),
      prisma.roomType.findMany({ where: { isArchive: false }, select: { id: true, name: true } }),
    ]);
    if (!readings.length) return fail("No rooms with sizes were found on this floor plan.", 422);
    return NextResponse.json({ success: true, rooms: buildRoomSuggestions(readings, roomTypes) });
  } catch (e) {
    if (e instanceof FloorPlanReadError) return fail(e.message, e.status);
    console.error("[floor-plan-rooms] failed", e);
    return fail("Could not read the floor plan. Try again.", 500);
  }
}
