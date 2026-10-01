import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_PROJECT_LIST_OPTIONS } from "@/lib/pagination";
import { getSession } from "@/lib/session";
import { listProjects } from "@/server/services/project.service";
import { parseProjectFilters } from "@/server/services/project-filter.service";

export async function POST(request: NextRequest) {
  let params: Record<string, string | undefined> = {};
  try {
    const body = (await request.json()) as Record<string, unknown>;
    for (const [k, v] of Object.entries(body)) {
      if (v == null) continue;
      params[k] = Array.isArray(v) ? v.map(String).join(",") : String(v);
    }
  } catch {
    /* empty body */
  }

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
