import { NextRequest, NextResponse } from "next/server";
import { getUnitsRaw } from "@/server/services/unit.service";

/** Legacy: GET /getunits?project_id= | ?unit_id= */
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("project_id");
  const unitId = request.nextUrl.searchParams.get("unit_id");

  const rows = await getUnitsRaw(
    projectId ? Number(projectId) : undefined,
    unitId ? Number(unitId) : undefined
  );

  return NextResponse.json(rows);
}
