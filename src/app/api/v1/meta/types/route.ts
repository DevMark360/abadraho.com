import { NextResponse } from "next/server";
import { listMetaProjectTypes } from "@/server/services/public-meta.service";

export async function GET() {
  const data = await listMetaProjectTypes();
  return NextResponse.json(data);
}
