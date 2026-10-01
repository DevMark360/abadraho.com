import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { getRecommendations } from "@/server/services/recommendations.service";
import {
  GUEST_COOKIE,
  parseGuestRecentIds,
  getUserRecentViews,
} from "@/server/services/recent-view.service";

export async function POST(request: NextRequest) {
  // Accept extra guest IDs from localStorage in request body
  let guestIds: number[] = [];
  try {
    const body = await request.json();
    if (Array.isArray(body.viewedIds)) {
      guestIds = body.viewedIds
        .map(Number)
        .filter((n: number) => Number.isFinite(n) && n > 0)
        .slice(0, 20);
    }
  } catch {
    // body optional
  }

  const session = await getSession();
  let viewedIds: number[] = [];

  if (session) {
    // Logged-in: get from DB recent views
    try {
      const dbViews = await getUserRecentViews(session.id, undefined);
      viewedIds = dbViews.map((p) => p.id);
    } catch {
      viewedIds = [];
    }
  } else {
    // Guest: cookie + any extra IDs from body
    const jar = await cookies();
    const cookieIds = parseGuestRecentIds(jar.get(GUEST_COOKIE)?.value);
    viewedIds = [...new Set([...cookieIds, ...guestIds])];
  }

  if (!viewedIds.length) {
    return NextResponse.json({ success: true, projects: [] });
  }

  const recommendations = await getRecommendations(viewedIds, 6, session?.id);
  return NextResponse.json({ success: true, projects: recommendations });
}
