import { NextResponse } from "next/server";
import { requireAdvertisingApi } from "@/lib/advertising-api-guard";
import { loadAdvertisingDashboard } from "@/server/services/advertising-portal.service";

export async function GET() {
  const auth = await requireAdvertisingApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const data = await loadAdvertisingDashboard(auth.builderId);
    if (!data) {
      return NextResponse.json({ success: false, message: "Builder not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...data });
  } catch (e) {
    console.error("[advertising/dashboard]", e);
    return NextResponse.json(
      {
        success: false,
        message: "Advertising portal could not load dashboard data.",
        code: "DASHBOARD_ERROR",
      },
      { status: 500 }
    );
  }
}
