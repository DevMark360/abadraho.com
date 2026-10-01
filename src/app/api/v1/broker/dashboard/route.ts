import { NextResponse } from "next/server";
import { requireBrokerApi } from "@/lib/broker-api-guard";
import { loadBrokerDashboard } from "@/server/services/broker-portal.service";

export async function GET() {
  const auth = await requireBrokerApi();
  if (auth instanceof NextResponse) return auth;

  try {
    const { loadBrokerOpsStats } = await import("@/server/services/broker-agent-ops.service");
    const [data, opsStats] = await Promise.all([
      loadBrokerDashboard(auth.broker.id),
      loadBrokerOpsStats(auth.broker.id).catch((err) => {
        console.error("[broker/dashboard] opsStats", err);
        return undefined;
      }),
    ]);
    if (!data) {
      return NextResponse.json({ success: false, message: "Broker not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, ...data, ...(opsStats ? { opsStats } : {}) });
  } catch (e) {
    console.error("[broker/dashboard]", e);
    return NextResponse.json(
      {
        success: false,
        message: "Agent portal could not load dashboard data.",
        code: "DASHBOARD_ERROR",
      },
      { status: 500 }
    );
  }
}
