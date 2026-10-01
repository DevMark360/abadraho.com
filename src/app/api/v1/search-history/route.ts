import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isTrackableVisitorRole } from "@/lib/roles";
import { createSearchHistory } from "@/server/services/public-forms.service";
import { createUserActivity } from "@/server/services/search-history.service";

function isLegacySearchPayload(body: Record<string, unknown>) {
  return (
    body.type === "housing_calc" ||
    body.type === "calculator" ||
    body.progress != null ||
    body.minDP != null ||
    body.maxDP != null ||
    body.minMI != null ||
    body.maxMI != null ||
    body.builder != null ||
    body.admin != null ||
    (Array.isArray(body.area) && body.area.length > 0)
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Sign in to save search history." },
        { status: 401 }
      );
    }
    // Staff/builder/agent traffic isn't real visitor behavior — accept but skip storage.
    if (!isTrackableVisitorRole(session.role)) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const result = isLegacySearchPayload(body)
      ? await createSearchHistory(body, session)
      : await createUserActivity(body, session);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/v1/search-history:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
