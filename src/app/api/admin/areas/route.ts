import { NextRequest, NextResponse } from "next/server";
import { requireFullStaffAdmin } from "@/lib/admin-api-guard";
import { listAdminAreasAndCities, createAdminArea } from "@/server/services/admin-area.service";

export async function GET() {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;

  const { areas, cities } = await listAdminAreasAndCities();
  return NextResponse.json({ success: true, areas, cities });
}

export async function POST(request: NextRequest) {
  const auth = await requireFullStaffAdmin();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name : "";
  const cityId = Number(body.cityId);

  const result = await createAdminArea(name, cityId);
  if (result.error) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, area: result.area });
}
