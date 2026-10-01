import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { fetchMapProjects } from "@/server/services/map-data.service";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const session = await getSession();
  const data = await fetchMapProjects(searchParams.toString(), session?.id);
  return NextResponse.json({ success: true, data });
}
