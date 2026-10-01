import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { success: false, message: "Legacy proxy removed — use /api/v1/* routes" },
    { status: 410 }
  );
}

export async function POST() {
  return GET();
}
