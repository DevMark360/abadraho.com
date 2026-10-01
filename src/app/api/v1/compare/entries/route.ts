import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUserCompareEntries } from "@/server/services/user-compare.service";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, entries: [] }, { status: 401 });
  }
  const entries = await getUserCompareEntries(session.id);
  return NextResponse.json({ success: true, entries });
}
