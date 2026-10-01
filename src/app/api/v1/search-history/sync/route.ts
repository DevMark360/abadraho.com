import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isTrackableVisitorRole } from "@/lib/roles";
import {
  syncGuestHistory,
  SEARCH_HISTORY_SYNC_MAX,
  type ActivityPayload,
} from "@/server/services/search-history.service";

/** Merge sessionStorage guest history into DB after login — single bulk INSERT only */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Sign in required" }, { status: 401 });
  }
  // Staff/builder/agent traffic isn't real visitor behavior — drop the buffered guest history.
  if (!isTrackableVisitorRole(session.role)) {
    return NextResponse.json({ success: true, added: 0 });
  }

  try {
    const body = await request.json();
    const history = Array.isArray(body.history)
      ? (body.history as ActivityPayload[]).slice(0, SEARCH_HISTORY_SYNC_MAX)
      : [];

    if (!history.length) {
      return NextResponse.json({ success: true, added: 0 });
    }

    const result = await syncGuestHistory(session.id, history);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({ success: true, added: result.added });
  } catch (error) {
    console.error("Sync Error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
