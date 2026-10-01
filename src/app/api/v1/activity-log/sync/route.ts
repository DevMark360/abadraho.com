import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isTrackableVisitorRole } from "@/lib/roles";
import {
  syncGuestActivityLog,
  ACTIVITY_LOG_SYNC_MAX,
  type GuestActivityEventInput,
} from "@/server/services/activity-log-client.service";

/** Merge sessionStorage guest activity events into the DB after login — single bulk insert only. */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Sign in required" }, { status: 401 });
  }
  // Staff/builder/agent traffic isn't real visitor behavior — drop the buffered guest events.
  if (!isTrackableVisitorRole(session.role)) {
    return NextResponse.json({ success: true, added: 0 });
  }

  try {
    const body = await request.json();
    const events = Array.isArray(body.events)
      ? (body.events as GuestActivityEventInput[]).slice(0, ACTIVITY_LOG_SYNC_MAX)
      : [];

    if (!events.length) {
      return NextResponse.json({ success: true, added: 0 });
    }

    const result = await syncGuestActivityLog(session.id, events);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Activity log sync error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
