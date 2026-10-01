import { NextRequest, NextResponse } from "next/server";
import { brokerAttributionCookieOptions } from "@/lib/broker-attribution";
import { resolveBrokerShortLink } from "@/server/services/broker-short-link.service";

export const dynamic = "force-dynamic";

/** Broker short link — tracks click and redirects to project page (same host/port as request). */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string; code: string }> }
) {
  const { slug, code } = await context.params;
  const { path, agentCode } = await resolveBrokerShortLink(slug, code);
  const res = NextResponse.redirect(new URL(path, request.url), 307);
  if (agentCode) {
    res.cookies.set(brokerAttributionCookieOptions(agentCode));
  }
  return res;
}
