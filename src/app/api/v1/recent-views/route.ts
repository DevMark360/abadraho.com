import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import {
  GUEST_COOKIE,
  getUserRecentViews,
  guestRecentViewsCookieOptions,
  mergeGuestRecentIds,
  parseGuestRecentIds,
  recordRecentView,
  serializeGuestRecentIds,
} from "@/server/services/recent-view.service";
import { listProjectsByIds } from "@/server/services/project.service";

export async function GET(request: NextRequest) {
  const exclude = request.nextUrl.searchParams.get("excludeProjectId");
  const excludeId = exclude ? Number(exclude) : undefined;
  const session = await getSession();

  if (session) {
    const projects = await getUserRecentViews(session.id, excludeId);
    return NextResponse.json({ success: true, projects });
  }

  const jar = await cookies();
  const ids = parseGuestRecentIds(jar.get(GUEST_COOKIE)?.value);
  const filtered = excludeId ? ids.filter((id) => id !== excludeId) : ids;
  if (!filtered.length) {
    return NextResponse.json({ success: true, projects: [] });
  }

  const projects = await listProjectsByIds(filtered);
  return NextResponse.json({ success: true, projects });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const projectId = Number(body.projectId ?? body.project_id);
  if (!projectId) {
    return NextResponse.json({ success: false, message: "projectId required" }, { status: 400 });
  }

  const session = await getSession();
  if (session) {
    await recordRecentView(session.id, projectId);
    return NextResponse.json({ success: true, stored: "db" });
  }

  const jar = await cookies();
  const current = parseGuestRecentIds(jar.get(GUEST_COOKIE)?.value);
  const next = mergeGuestRecentIds(current, projectId);
  const res = NextResponse.json({ success: true, stored: "cookie" });
  res.cookies.set(GUEST_COOKIE, serializeGuestRecentIds(next), guestRecentViewsCookieOptions());
  return res;
}
