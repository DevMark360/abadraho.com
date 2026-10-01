import { NextRequest, NextResponse } from "next/server";
import { getSimilarProjects } from "@/server/services/similar-projects.service";

/** Legacy: POST /api/projects/similar */
export async function POST(request: NextRequest) {
  let body: { project_id?: number | string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid body" },
      { status: 400 }
    );
  }

  const projectId = Number(body.project_id);
  if (!projectId || Number.isNaN(projectId)) {
    return NextResponse.json(
      { success: false, message: "project_id required" },
      { status: 400 }
    );
  }

  const projects = await getSimilarProjects(projectId, 12);
  return NextResponse.json(projects);
}
