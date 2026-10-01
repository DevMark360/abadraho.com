import { NextRequest, NextResponse } from "next/server";
import {
  brokerAttributionCookieOptions,
  normalizeAgentCode,
} from "@/lib/broker-attribution";
import { resolveBrokerByAgentCode } from "@/server/services/broker-agent-ops.service";

/** Persist agent referral from client (?ref= on any page). */
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }

  const agentCode = normalizeAgentCode(String(body.agent_code ?? body.ref ?? ""));
  if (!agentCode) {
    return NextResponse.json({ success: false, message: "Agent code required" }, { status: 400 });
  }

  const brokerId = await resolveBrokerByAgentCode(agentCode);
  if (!brokerId) {
    return NextResponse.json({ success: false, message: "Unknown agent code" }, { status: 404 });
  }

  const res = NextResponse.json({ success: true, brokerId, agentCode });
  res.cookies.set(brokerAttributionCookieOptions(agentCode));
  return res;
}
