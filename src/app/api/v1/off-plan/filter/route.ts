import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_PROJECT_LIST_OPTIONS } from "@/lib/pagination";
import { getSession } from "@/lib/session";
import { listProjects } from "@/server/services/project.service";
import { fetchMapProjects } from "@/server/services/map-data.service";
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
    /* empty */
  }

  const session = await getSession();
  const filters = parseProjectFilters(
    { ...params, perPage: "12", page: params.page ?? "1" },
    PUBLIC_PROJECT_LIST_OPTIONS
  );
  if (session?.id) filters.viewerUserId = session.id;

  const [{ items, total }, projectsForMap] = await Promise.all([
    listProjects(filters),
    fetchMapProjects(new URLSearchParams(params as Record<string, string>).toString(), session?.id),
  ]);

  return NextResponse.json({
    success: true,
    projects: items,
    projectsForMap,
    totalCount: total,
    projectsHtml: "",
    paginationHtml: "",
  });
}
