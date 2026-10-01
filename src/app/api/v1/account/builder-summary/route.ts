import { NextResponse } from "next/server";
import { userTypeIds } from "@/config/site";
import { getSession } from "@/lib/session";
import { getBuilderAccountSummary } from "@/server/services/builder-account.service";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  if (session.userTypeId !== userTypeIds.builder) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const summary = await getBuilderAccountSummary(session.id);
  return NextResponse.json({ success: true, summary });
}
