import { NextRequest, NextResponse } from "next/server";
import { requireBrokerApi } from "@/lib/broker-api-guard";
import { listBrokerProjects } from "@/server/services/broker-portal.service";

export async function GET(request: NextRequest) {
  const auth = await requireBrokerApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = request.nextUrl;
    const page = Number(searchParams.get("page") ?? "1");
    const pageSize = Number(searchParams.get("pageSize") ?? "30");
    const q = searchParams.get("q") ?? undefined;

    const result = await listBrokerProjects(auth.broker.id, { page, pageSize, q });
    return NextResponse.json({ success: true, ...result, broker: auth.broker });
  } catch (e) {
    console.error("[broker/projects]", e);
    return NextResponse.json(
      { success: false, message: "Could not load projects", code: "DASHBOARD_ERROR" },
      { status: 500 }
    );
  }
}
