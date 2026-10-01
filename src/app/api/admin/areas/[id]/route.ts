import { NextRequest, NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { setAreaCity } from "@/server/services/admin-area.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const areaId = Number(id);
  if (!Number.isFinite(areaId) || areaId <= 0) {
    return NextResponse.json({ success: false, message: "Invalid area id" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const cityId = Number(body.cityId);

  const result = await setAreaCity(areaId, cityId);
  if (!result.success) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
