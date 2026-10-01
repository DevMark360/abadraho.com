import { NextRequest, NextResponse } from "next/server";
import { clampIdList } from "@/lib/pagination";
import { getSession } from "@/lib/session";
import { getCompareProjects } from "@/server/services/compare.service";
import { toJsonSafe } from "@/lib/prisma-json";

export async function POST(request: NextRequest) {
  const { ids } = (await request.json()) as { ids?: number[] };
  const idList = clampIdList(ids);
  if (!idList.length) {
    return NextResponse.json({ success: true, data: [] });
  }
  const session = await getSession();
  const data = await getCompareProjects(idList, {
    includeUnitDetails: Boolean(session),
    viewerUserId: session?.id,
  });
  return NextResponse.json(toJsonSafe({ success: true, data }));
}
