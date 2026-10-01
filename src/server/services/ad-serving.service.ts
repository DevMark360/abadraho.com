import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { resolveProjectImageUrls } from "@/lib/project-media";

export type AdPlacementType = "featured_listing" | "banner" | "sponsored_content";

export type ServedAd = {
  campaignId: number;
  slotKey: string;
  effectiveCpm: number;
  creativeUrl: string | null;
  title: string;
  builderName: string;
  project: {
    id: number;
    name: string;
    slug: string;
    imageUrl: string | null;
    area: string | null;
    minPrice: number | null;
  };
};

export type RotationSlot = ServedAd & { shareSeconds: number };

function buildSlotKey(
  placementType: AdPlacementType,
  areaId?: number | string | null,
  projectTypeId?: number | null,
  tier?: string | null
): string {
  return `${placementType}:${areaId ?? "any"}:${projectTypeId ?? "any"}:${tier ?? "any"}`;
}

/**
 * Reads the current rotation for a slot — every campaign sharing this slot's 60-second cycle,
 * with its allocated seconds. No auction/allocation math runs here, that's
 * scripts/run-ad-auction.mjs's job (see the time-shared rotation milestones). Ordered by
 * shareSeconds desc so the biggest slice renders first if a caller only wants one.
 * Empty array (not null) when nothing is currently eligible — callers render nothing on empty,
 * same as the old null-ad case.
 */
export async function getSlotRotation(
  placementType: AdPlacementType,
  areaId?: number | string | null,
  projectTypeId?: number | null,
  tier?: string | null
): Promise<RotationSlot[]> {
  if (!isDatabaseEnabled()) return [];

  const slotKey = buildSlotKey(placementType, areaId, projectTypeId, tier);
  const rows = await prisma.adSlotAllocation.findMany({
    where: { slotKey, validUntil: { gte: new Date() } },
  });
  if (rows.length === 0) return [];

  const campaigns = await prisma.adCampaign.findMany({
    where: { id: { in: rows.map((r) => r.campaignId) }, status: "live" },
    include: {
      builder: { select: { fullName: true, adWallet: { select: { balance: true } } } },
      project: {
        select: {
          id: true,
          name: true,
          slug: true,
          projectCoverImg: true,
          projectImgs: true,
          minPrice: true,
          location: { select: { name: true } },
        },
      },
    },
  });
  const campaignById = new Map(campaigns.map((c) => [c.id, c]));

  const slots: RotationSlot[] = [];
  for (const row of rows) {
    const campaign = campaignById.get(row.campaignId);
    if (!campaign) continue; // re-check — a row can go stale mid-cycle if the campaign paused/completed since the last cron run
    // Billing never takes a wallet below zero, so a wallet that can't pay for one impression
    // would otherwise get its ads shown for free until the next auction run.
    const balance = Number(campaign.builder.adWallet?.balance ?? 0);
    if (balance < Number(row.effectiveCpm) / 1000) continue;
    slots.push({
      campaignId: campaign.id,
      slotKey,
      effectiveCpm: Number(row.effectiveCpm),
      shareSeconds: row.shareSeconds,
      creativeUrl: campaign.creativeUrl,
      title: campaign.title,
      builderName: campaign.builder.fullName,
      project: {
        id: campaign.project.id,
        name: campaign.project.name,
        slug: campaign.project.slug,
        imageUrl:
          resolveProjectImageUrls(campaign.project.projectCoverImg, campaign.project.projectImgs)[0] ??
          null,
        area: campaign.project.location?.name ?? null,
        minPrice: campaign.project.minPrice != null ? Number(campaign.project.minPrice) : null,
      },
    });
  }

  return slots.sort((a, b) => b.shareSeconds - a.shareSeconds);
}

/**
 * Today's date, anchored at UTC midnight of the *local* calendar day — not `setHours(0,0,0,0)`,
 * which computes local midnight as a UTC instant. For any positive-UTC-offset timezone (this
 * deploys in Asia/Karachi, UTC+5), that instant's own UTC calendar date is still "yesterday"
 * during the first several hours of the local day — and MySQL's DATE columns store just the UTC
 * calendar date of whatever instant they're given, silently bucketing spend/impressions into the
 * wrong day. Using local Y/M/D to build a UTC-midnight instant avoids that entirely.
 */
function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/**
 * Called once per rotation slice actually confirmed visible (see
 * /api/v1/ads/impression/[campaignId] — never called directly from a page render anymore, since
 * under rotation nothing is billable just because it was rendered; it has to have been seen).
 * Cost per impression = effectiveCpm / 1000 (CPM = price per 1000 impressions), deducted
 * from the builder's wallet immediately. The wallet never goes below zero, but a campaign can
 * still run slightly over its budgetCap between auction runs; scripts/run-ad-auction.mjs's
 * auto-stop check bounds that overrun to roughly one auction cycle.
 * Returns true when the impression was billed and counted.
 */
export async function recordAdSliceImpression(
  campaignId: number,
  effectiveCpm: number
): Promise<boolean> {
  if (!isDatabaseEnabled()) return false;
  const date = startOfToday();
  const cost = effectiveCpm / 1000;
  if (!Number.isFinite(cost) || cost <= 0) return false;

  const campaign = await prisma.adCampaign.findUnique({
    where: { id: campaignId },
    select: { builderId: true },
  });
  if (!campaign) return false;

  // Wallet debit and stat row move together, and the debit only applies while the balance
  // covers it — an empty wallet stops billing (and counting) instead of going negative.
  return prisma.$transaction(async (tx) => {
    const debit = await tx.adWallet.updateMany({
      where: { builderId: campaign.builderId, balance: { gte: cost } },
      data: { balance: { decrement: cost } },
    });
    if (debit.count === 0) return false;

    await tx.adDailyStat.upsert({
      where: { campaignId_date: { campaignId, date } },
      create: { campaignId, date, impressions: 1, spend: cost },
      update: { impressions: { increment: 1 }, spend: { increment: cost } },
    });
    return true;
  });
}

export async function recordAdClick(campaignId: number): Promise<void> {
  if (!isDatabaseEnabled()) return;
  const date = startOfToday();
  await prisma.adDailyStat.upsert({
    where: { campaignId_date: { campaignId, date } },
    create: { campaignId, date, clicks: 1 },
    update: { clicks: { increment: 1 } },
  });
}
