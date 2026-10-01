import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { listMetaAreas } from "@/server/services/public-meta.service";
import { loadTeamScopedMetaAreas } from "@/server/services/project-scope.service";

export async function GET() {
  const session = await getSession();
  if (session?.id) {
    const scoped = await loadTeamScopedMetaAreas(session.id);
    if (scoped) return NextResponse.json(scoped);
  }

  const data = await listMetaAreas();
  return NextResponse.json(data);
}
