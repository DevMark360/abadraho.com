import { NextRequest, NextResponse } from "next/server";
import { getUnitById } from "@/server/services/unit.service";

/** Legacy: POST /api/unit-types — body `{ id }` = unit id */
export async function POST(request: NextRequest) {
  let body: { id?: number | string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(null, { status: 400 });
  }

  const id = Number(body.id);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json(null, { status: 400 });
  }

  const unit = await getUnitById(id);
  return NextResponse.json(unit);
}
