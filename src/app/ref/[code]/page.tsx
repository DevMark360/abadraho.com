import { redirect } from "next/navigation";
import type { Route } from "next";
import { cookies } from "next/headers";
import {
  brokerAttributionCookieOptions,
  normalizeAgentCode,
} from "@/lib/broker-attribution";
import {
  ensureBrokerAgentCode,
  logReferralClick,
  resolveBrokerByAgentCode,
} from "@/server/services/broker-agent-ops.service";

type Props = { params: Promise<{ code: string }> };

export default async function ReferralPage({ params }: Props) {
  const { code } = await params;
  const normalized = normalizeAgentCode(code);
  const brokerId = await resolveBrokerByAgentCode(normalized);
  const cookieStore = await cookies();
  const sessionKey = cookieStore.get("abadraho_session")?.value?.slice(0, 32) ?? null;

  if (brokerId) {
    await logReferralClick(brokerId, sessionKey);
    const agentCode = await ensureBrokerAgentCode(brokerId);
    cookieStore.set(brokerAttributionCookieOptions(agentCode));
  }

  redirect(("/?ref=" + encodeURIComponent(normalized)) as Route);
}
