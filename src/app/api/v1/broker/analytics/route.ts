import { NextResponse } from "next/server";
import { requireBrokerApi } from "@/lib/broker-api-guard";
import { loadBrokerAnalytics } from "@/server/services/broker-portal.service";

export async function GET() {
  const auth = await requireBrokerApi();
  if (auth instanceof NextResponse) return auth;

  const analytics = await loadBrokerAnalytics(auth.broker.id);
  return NextResponse.json({ success: true, analytics, broker: auth.broker });
}
