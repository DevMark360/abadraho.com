import { NextRequest, NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { renameAdminCity } from "@/server/services/admin-area.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const cityId = Number(id);
  if (!Number.isFinite(cityId) || cityId <= 0) {
    return NextResponse.json({ success: false, message: "Invalid city id" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name : "";

  const result = await renameAdminCity(cityId, name);
  if (result.error) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, city: result.city });
}
