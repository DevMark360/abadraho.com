import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAdClick } from "@/server/services/ad-serving.service";
import { resolveRequestSiteUrl } from "@/lib/app-url";

/**
 * Click-tracking redirect — the destination is always resolved server-side from the
 * campaign's own project, never from a client-supplied URL, so this can't be abused
 * as an open redirect.
 *
 * Builds the redirect target from resolveRequestSiteUrl (proxy-aware — reads
 * x-forwarded-host/x-forwarded-proto) rather than `request.url` directly, since behind
 * cPanel's reverse proxy `request.url`'s origin can end up reflecting the internal
 * localhost port Node is actually bound to instead of the public domain.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const siteUrl = resolveRequestSiteUrl(request);
  const { campaignId: raw } = await params;
  const campaignId = Number(raw);
  if (!Number.isFinite(campaignId) || campaignId <= 0) {
    return NextResponse.redirect(new URL("/", siteUrl));
  }

  const campaign = await prisma.adCampaign.findFirst({
    where: { id: campaignId },
    select: { project: { select: { slug: true } } },
  });
  if (!campaign) {
    return NextResponse.redirect(new URL("/", siteUrl));
  }

  recordAdClick(campaignId).catch(() => {});

  return NextResponse.redirect(new URL(`/project/${campaign.project.slug}`, siteUrl));
}
