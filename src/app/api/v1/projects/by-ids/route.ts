import { NextRequest, NextResponse } from "next/server";
import { clampIdList } from "@/lib/pagination";
import { getSession } from "@/lib/session";
import { listProjectsByIds } from "@/server/services/project.service";

export async function POST(request: NextRequest) {
  const { ids } = (await request.json()) as { ids?: number[] };
  const idList = clampIdList(ids);
  const session = await getSession();
  const data = await listProjectsByIds(idList, session?.id);
  return NextResponse.json({ success: true, data });
}
