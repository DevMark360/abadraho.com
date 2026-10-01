import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_PROJECT_LIST_OPTIONS } from "@/lib/pagination";
import { getSession } from "@/lib/session";
import { listProjects } from "@/server/services/project.service";
import { parseProjectFilters } from "@/server/services/project-filter.service";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const params: Record<string, string | undefined> = {};
  searchParams.forEach((v, k) => {
    params[k] = v;
  });
  const session = await getSession();
  const filters = parseProjectFilters(params, PUBLIC_PROJECT_LIST_OPTIONS);
  if (session?.id) filters.viewerUserId = session.id;

  const result = await listProjects(filters);
  return NextResponse.json({
    success: true,
    data: result.items,
    meta: { total: result.total, source: result.source },
  });
}
