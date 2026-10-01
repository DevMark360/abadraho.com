import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-api-guard";
import { getRecentActivity } from "@/server/services/admin-recent-activity.service";

export async function GET() {
  const auth = await requireAdminSession();
  if (auth instanceof NextResponse) return auth;
  const items = await getRecentActivity();
  return NextResponse.json({ success: true, items });
}
