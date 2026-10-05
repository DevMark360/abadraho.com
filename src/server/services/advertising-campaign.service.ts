import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { createNotification } from "@/server/services/notification.service";
import { resolveRecipientForUser } from "@/lib/notifications/recipient";
import type { AdminSession } from "@/lib/admin-session-cookie";
import { type AdWalletActor } from "@/server/services/advertising-wallet.service";
import {
  slotCombinationsForCampaign,
  slotKey as buildSlotKey,
  MIN_SLICE_SECONDS,
  ROTATION_CYCLE_SECONDS,
} from "@/lib/ad-auction-core.mjs";

export const AD_PLACEMENT_TYPES = ["featured_listing", "banner", "sponsored_content"] as const;
export type AdPlacementType = (typeof AD_PLACEMENT_TYPES)[number];

export const AD_CAMPAIGN_TIERS = ["luxury", "premium", "mid_range", "affordable"] as const;
export type AdCampaignTierValue = (typeof AD_CAMPAIGN_TIERS)[number];

export type AdCampaignRow = {
  id: number;
  builderId: number;
  projectId: number;
  placementType: string;
  title: string;
  creativeUrl: string | null;
  status: string;
  rejectionReason: string | null;
  maxBidCpm: number;
  budgetCap: number;
  dailyBudget: number | null;
  impressionCap: number | null;
  startDate: string;
  endDate: string;
  ctrBand: number;
  areaIds: number[];
  projectTypeIds: number[];
  tiers: string[];
  refundedAt: string | null;
  refundAmount: number | null;
  isArchive: boolean;
  createdAt: string;
  updatedAt: string;
};

type CampaignWithJoins = {
  id: number;
  builderId: number;
  projectId: number;
  placementType: string;
  title: string;
  creativeUrl: string | null;
  status: string;
  rejectionReason: string | null;
  maxBidCpm: unknown;
  budgetCap: unknown;
  dailyBudget: unknown;
  impressionCap: number | null;
  startDate: Date;
  endDate: Date;
  ctrBand: number;
  createdAt: Date;
  updatedAt: Date;
  areas: { areaId: bigint }[];
  projectTypes: { projectTypeId: number }[];
  tiers: { tier: string }[];
  refundedAt: Date | null;
  refundAmount: unknown;
  isArchive: boolean;
};

function toCampaignRow(campaign: CampaignWithJoins): AdCampaignRow {
  return {
    id: campaign.id,
    builderId: campaign.builderId,
    projectId: campaign.projectId,
    placementType: campaign.placementType,
    title: campaign.title,
    creativeUrl: campaign.creativeUrl,
    status: campaign.status,
    rejectionReason: campaign.rejectionReason,
    maxBidCpm: Number(campaign.maxBidCpm),
    budgetCap: Number(campaign.budgetCap),
    dailyBudget: campaign.dailyBudget != null ? Number(campaign.dailyBudget) : null,
    impressionCap: campaign.impressionCap,
    startDate: campaign.startDate.toISOString(),
    endDate: campaign.endDate.toISOString(),
    ctrBand: campaign.ctrBand,
    areaIds: campaign.areas.map((a) => Number(a.areaId)),
    projectTypeIds: campaign.projectTypes.map((t) => t.projectTypeId),
    tiers: campaign.tiers.map((t) => t.tier),
    refundedAt: campaign.refundedAt ? campaign.refundedAt.toISOString() : null,
    refundAmount: campaign.refundAmount != null ? Number(campaign.refundAmount) : null,
    isArchive: campaign.isArchive,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

const campaignInclude = { areas: true, projectTypes: true, tiers: true } as const;

export type CreateAdCampaignInput = {
  projectId: number;
  placementType: AdPlacementType;
  title: string;
  maxBidCpm: number;
  budgetCap: number;
  /** Optional — when omitted, the auction derives it as budgetCap ÷ campaign duration in days. */
  dailyBudget?: number | null;
  impressionCap?: number | null;
  startDate: string | Date;
  endDate: string | Date;
  areaIds?: Array<number | string>;
  projectTypeIds?: number[];
  tiers?: string[];
};

function validateCampaignInput(input: CreateAdCampaignInput): string | null {
  if (!AD_PLACEMENT_TYPES.includes(input.placementType)) {
    return "Invalid placement type";
  }
  if (input.tiers?.some((tier) => !AD_CAMPAIGN_TIERS.includes(tier as AdCampaignTierValue))) {
    return "Invalid project tier";
  }
  if (!input.title?.trim()) return "Title is required";
  if (!Number.isFinite(input.maxBidCpm) || input.maxBidCpm <= 0) {
    return "Max bid CPM must be greater than zero";
  }
  if (!Number.isFinite(input.budgetCap) || input.budgetCap <= 0) {
    return "Budget cap must be greater than zero";
  }
  if (input.dailyBudget != null) {
    if (!Number.isFinite(input.dailyBudget) || input.dailyBudget <= 0) {
      return "Daily budget must be greater than zero";
    }
    if (input.dailyBudget > input.budgetCap) {
      return "Daily budget can't exceed the total budget cap";
    }
  }
  if (input.impressionCap != null && (!Number.isFinite(input.impressionCap) || input.impressionCap <= 0)) {
    return "Impression cap must be greater than zero";
  }
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
    return "End date must be after start date";
  }
  return null;
}

/** Direct ownership only (ProjectOwner) — team-assigned-project advertising is a future enhancement. */
async function builderOwnsProjectDirectly(builderId: number, projectId: number): Promise<boolean> {
  const owner = await prisma.projectOwner.findFirst({ where: { projectId, builderId } });
  return Boolean(owner);
}

async function findOwnedCampaign(
  builderId: number,
  campaignId: number
): Promise<CampaignWithJoins | null> {
  return prisma.adCampaign.findFirst({
    where: { id: campaignId, builderId },
    include: campaignInclude,
  });
}

export async function getAdCampaignForBuilder(
  builderId: number,
  campaignId: number
): Promise<AdCampaignRow | null> {
  if (!isDatabaseEnabled()) return null;
  const campaign = await findOwnedCampaign(builderId, campaignId);
  return campaign ? toCampaignRow(campaign) : null;
}

export type AdCampaignStats = {
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
};

export async function getAdCampaignStats(
  builderId: number,
  campaignId: number
): Promise<AdCampaignStats | null> {
  if (!isDatabaseEnabled()) return null;
  const owned = await findOwnedCampaign(builderId, campaignId);
  if (!owned) return null;

  const agg = await prisma.adDailyStat.aggregate({
    where: { campaignId },
    _sum: { impressions: true, clicks: true, spend: true },
  });
  const impressions = agg._sum.impressions ?? 0;
  const clicks = agg._sum.clicks ?? 0;
  return {
    impressions,
    clicks,
    spend: Number(agg._sum.spend ?? 0),
    ctr: impressions > 0 ? clicks / impressions : 0,
  };
}

export type AdCampaignPacing = {
  daysElapsed: number;
  totalDays: number;
  impressions: number;
  spend: number;
  impressionCap: number | null;
  budgetCap: number;
  /** Most recent winning bid for this campaign in any still-valid slot, or null if it isn't currently winning anywhere. */
  currentEffectiveCpm: number | null;
  pacingBasis: "impressions" | "budget";
  actualPace: number;
  targetPace: number;
  status: "not_started" | "on_track" | "under_delivering" | "completed";
};

/**
 * Pacing = actual delivery rate (per day, since start) vs the rate needed to exactly use up
 * the impression cap (or budget cap, if no impression cap is set) by the campaign's end date.
 * Read-only — computed entirely from AdDailyStat/AdSlotWinner rows already being collected by
 * the auction script and impression tracking; no new data collection needed for this.
 */
export async function getAdCampaignPacing(
  builderId: number,
  campaignId: number
): Promise<AdCampaignPacing | null> {
  if (!isDatabaseEnabled()) return null;
  const campaign = await findOwnedCampaign(builderId, campaignId);
  if (!campaign) return null;
  // Pacing/auction insight only makes sense once a campaign is actually live and competing
  // in the auction — a draft, submitted, approved-but-not-started, rejected, or paused
  // campaign has no delivery to pace against and would only show confusing zeros.
  if (campaign.status !== "live") return null;

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(1, Math.ceil((campaign.endDate.getTime() - campaign.startDate.getTime()) / dayMs));
  const elapsedMs = Math.min(now.getTime(), campaign.endDate.getTime()) - campaign.startDate.getTime();
  const daysElapsed = Math.min(totalDays, Math.max(1, Math.ceil(elapsedMs / dayMs)));

  const [agg, latestAllocation] = await Promise.all([
    prisma.adDailyStat.aggregate({
      where: { campaignId },
      _sum: { impressions: true, spend: true },
    }),
    prisma.adSlotAllocation.findFirst({
      where: { campaignId, validUntil: { gte: now } },
      orderBy: { computedAt: "desc" },
    }),
  ]);

  const impressions = agg._sum.impressions ?? 0;
  const spend = Number(agg._sum.spend ?? 0);
  const budgetCap = Number(campaign.budgetCap);

  const usingImpressionCap = campaign.impressionCap != null && campaign.impressionCap > 0;
  const pacingBasis: "impressions" | "budget" = usingImpressionCap ? "impressions" : "budget";
  const actualPace = usingImpressionCap ? impressions / daysElapsed : spend / daysElapsed;
  const targetPace = usingImpressionCap ? (campaign.impressionCap as number) / totalDays : budgetCap / totalDays;

  let status: AdCampaignPacing["status"];
  if (now < campaign.startDate) status = "not_started";
  else if (now > campaign.endDate) status = "completed";
  else status = actualPace >= targetPace * 0.9 ? "on_track" : "under_delivering";

  return {
    daysElapsed,
    totalDays,
    impressions,
    spend,
    impressionCap: campaign.impressionCap,
    budgetCap,
    currentEffectiveCpm: latestAllocation ? Number(latestAllocation.effectiveCpm) : null,
    pacingBasis,
    actualPace,
    targetPace,
    status,
  };
}

export type AdCampaignSlotCompetition = {
  /** How many of this campaign's targeted slots currently have any other campaign sharing them. */
  slotsContesting: number;
  /** Average share of the 60-second rotation cycle this campaign holds across its targeted
   *  slots, 0-100. 100 means it's the only participant everywhere it targets. */
  avgSharePercent: number;
  /** How many targeted slots this campaign is stuck at (or near) the guaranteed floor share
   *  while a competitor there holds a much bigger slice — the closest equivalent to the old
   *  "losing" signal, since proportional sharing has no single winner/loser cliff. */
  slotsAtFloorShare: number;
  /** The weight (maxBidCpm × qualityScore × dailyBudget) of the strongest competitor in this
   *  campaign's most contested slot — directionally "how much stronger they are", not a single
   *  CPM number to beat, since raising a bid here only ever grows a share, never flips a switch. */
  strongestCompetitorWeight: number | null;
};

/**
 * How this campaign is sharing its targeted slots with competitors right now — under proportional
 * rotation there's no single winner/loser, so this reports share-based signals instead (see the
 * conversation that motivated this: builders had zero visibility into competing bids before, and
 * the model later moved from winner-take-all to time-shared rotation).
 */
export async function getAdCampaignSlotCompetition(
  builderId: number,
  campaignId: number
): Promise<AdCampaignSlotCompetition | null> {
  if (!isDatabaseEnabled()) return null;
  const campaign = await findOwnedCampaign(builderId, campaignId);
  if (!campaign) return null;
  if (campaign.status !== "live") return null;

  const combos = slotCombinationsForCampaign(campaign) as Array<{
    areaId: string | null;
    projectTypeId: number | null;
    tier: string | null;
  }>;
  const keys = combos.map(({ areaId, projectTypeId, tier }) =>
    buildSlotKey(campaign.placementType, areaId, projectTypeId, tier)
  );

  const rows = await prisma.adSlotAllocation.findMany({
    where: { slotKey: { in: keys }, validUntil: { gte: new Date() } },
    select: { slotKey: true, campaignId: true, shareSeconds: true, weight: true },
  });

  const bySlot = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!bySlot.has(row.slotKey)) bySlot.set(row.slotKey, []);
    bySlot.get(row.slotKey)!.push(row);
  }

  let slotsContesting = 0;
  let slotsAtFloorShare = 0;
  let strongestCompetitorWeight: number | null = null;
  let shareSum = 0;
  let shareCount = 0;

  for (const key of keys) {
    const slotRows = bySlot.get(key);
    if (!slotRows) continue; // not eligible/no fresh allocation for this exact slot yet
    const mine = slotRows.find((r) => r.campaignId === campaignId);
    if (!mine) continue;

    shareSum += mine.shareSeconds;
    shareCount++;

    const others = slotRows.filter((r) => r.campaignId !== campaignId);
    if (others.length === 0) continue; // no competition here — full share by definition

    slotsContesting++;
    const maxOtherShare = Math.max(...others.map((r) => r.shareSeconds));
    const maxOtherWeight = Math.max(...others.map((r) => Number(r.weight)));
    if (strongestCompetitorWeight == null || maxOtherWeight > strongestCompetitorWeight) {
      strongestCompetitorWeight = maxOtherWeight;
    }
    if (mine.shareSeconds <= MIN_SLICE_SECONDS && maxOtherShare > mine.shareSeconds * 2) {
      slotsAtFloorShare++;
    }
  }

  const avgSharePercent =
    shareCount === 0 ? 100 : Math.round((shareSum / shareCount / ROTATION_CYCLE_SECONDS) * 100);

  return { slotsContesting, avgSharePercent, slotsAtFloorShare, strongestCompetitorWeight };
}

export async function listAdCampaignsForBuilder(
  builderId: number,
  options?: { page?: number; pageSize?: number }
): Promise<{ items: AdCampaignRow[]; total: number; page: number; pageSize: number }> {
  if (!isDatabaseEnabled()) return { items: [], total: 0, page: 1, pageSize: 20 };

  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options?.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const [rows, total] = await Promise.all([
    prisma.adCampaign.findMany({
      where: { builderId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: campaignInclude,
    }),
    prisma.adCampaign.count({ where: { builderId } }),
  ]);

  return { items: rows.map(toCampaignRow), total, page, pageSize };
}

export async function createDraftAdCampaign(
  builderId: number,
  input: CreateAdCampaignInput
): Promise<{ success: boolean; campaign?: AdCampaignRow; error?: string }> {
  if (!isDatabaseEnabled()) return { success: false, error: "Database disabled" };

  const validationError = validateCampaignInput(input);
  if (validationError) return { success: false, error: validationError };

  const owns = await builderOwnsProjectDirectly(builderId, input.projectId);
  if (!owns) return { success: false, error: "You do not own this project" };

  const campaign = await prisma.adCampaign.create({
    data: {
      builderId,
      projectId: input.projectId,
      placementType: input.placementType,
      title: input.title.trim(),
      maxBidCpm: input.maxBidCpm,
      budgetCap: input.budgetCap,
      dailyBudget: input.dailyBudget ?? null,
      impressionCap: input.impressionCap ?? null,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      status: "draft",
      areas: { create: (input.areaIds ?? []).map((areaId) => ({ areaId: BigInt(areaId) })) },
      projectTypes: {
        create: (input.projectTypeIds ?? []).map((projectTypeId) => ({ projectTypeId })),
      },
      tiers: { create: (input.tiers ?? []).map((tier) => ({ tier })) },
    },
    include: campaignInclude,
  });

  return { success: true, campaign: toCampaignRow(campaign) };
}

export type UpdateAdCampaignInput = Partial<CreateAdCampaignInput>;

export async function updateDraftAdCampaign(
  builderId: number,
  campaignId: number,
  input: UpdateAdCampaignInput
): Promise<{ success: boolean; campaign?: AdCampaignRow; error?: string }> {
  if (!isDatabaseEnabled()) return { success: false, error: "Database disabled" };

  const existing = await findOwnedCampaign(builderId, campaignId);
  if (!existing) return { success: false, error: "Campaign not found" };
  if (existing.status !== "draft") {
    return { success: false, error: "Only draft campaigns can be edited" };
  }

  const merged: CreateAdCampaignInput = {
    projectId: input.projectId ?? existing.projectId,
    placementType: (input.placementType ?? existing.placementType) as AdPlacementType,
    title: input.title ?? existing.title,
    maxBidCpm: input.maxBidCpm ?? Number(existing.maxBidCpm),
    budgetCap: input.budgetCap ?? Number(existing.budgetCap),
    dailyBudget:
      input.dailyBudget !== undefined
        ? input.dailyBudget
        : existing.dailyBudget != null
          ? Number(existing.dailyBudget)
          : null,
    impressionCap: input.impressionCap !== undefined ? input.impressionCap : existing.impressionCap,
    startDate: input.startDate ?? existing.startDate,
    endDate: input.endDate ?? existing.endDate,
    areaIds: input.areaIds ?? existing.areas.map((a) => a.areaId.toString()),
    projectTypeIds: input.projectTypeIds ?? existing.projectTypes.map((t) => t.projectTypeId),
    tiers: input.tiers ?? existing.tiers.map((t) => t.tier),
  };

  const validationError = validateCampaignInput(merged);
  if (validationError) return { success: false, error: validationError };

  if (merged.projectId !== existing.projectId) {
    const owns = await builderOwnsProjectDirectly(builderId, merged.projectId);
    if (!owns) return { success: false, error: "You do not own this project" };
  }

  const campaign = await prisma.$transaction(async (tx) => {
    if (input.areaIds) {
      await tx.adCampaignArea.deleteMany({ where: { campaignId } });
    }
    if (input.projectTypeIds) {
      await tx.adCampaignProjectType.deleteMany({ where: { campaignId } });
    }
    if (input.tiers) {
      await tx.adCampaignTier.deleteMany({ where: { campaignId } });
    }
    return tx.adCampaign.update({
      where: { id: campaignId },
      data: {
        projectId: merged.projectId,
        placementType: merged.placementType,
        title: merged.title.trim(),
        maxBidCpm: merged.maxBidCpm,
        budgetCap: merged.budgetCap,
        dailyBudget: merged.dailyBudget ?? null,
        impressionCap: merged.impressionCap ?? null,
        startDate: new Date(merged.startDate),
        endDate: new Date(merged.endDate),
        ...(input.areaIds
          ? { areas: { create: input.areaIds.map((areaId) => ({ areaId: BigInt(areaId) })) } }
          : {}),
        ...(input.projectTypeIds
          ? {
              projectTypes: {
                create: input.projectTypeIds.map((projectTypeId) => ({ projectTypeId })),
              },
            }
          : {}),
        ...(input.tiers
          ? { tiers: { create: input.tiers.map((tier) => ({ tier })) } }
          : {}),
      },
      include: campaignInclude,
    });
  });

  return { success: true, campaign: toCampaignRow(campaign) };
}

/**
 * Quick bid-only update for a campaign that's already past the draft stage — the general
 * update path above is draft-only (targeting/schedule/placement shouldn't change mid-flight),
 * but a builder responding to competition needs to be able to raise (or lower) just the Max Bid
 * CPM on a live campaign.
 *
 * Deliberately no instant recompute here (unlike the old winner-take-all model, which could
 * take over a slot from a single prior winner immediately). Under proportional rotation, any
 * bid change requires re-ranking every other participant in every slot this campaign targets —
 * real, buildable work, just materially more complex than the old one-competitor comparison —
 * so this ships as a deferred follow-up rather than bundled in here. The new bid takes effect on
 * the next periodic auction run (within 15 minutes), the same SLA already used elsewhere in this
 * system (e.g. campaign activation).
 */
export async function raiseCampaignBid(
  builderId: number,
  campaignId: number,
  newMaxBidCpm: number
): Promise<{
  success: boolean;
  campaign?: AdCampaignRow;
  error?: string;
}> {
  if (!isDatabaseEnabled()) return { success: false, error: "Database disabled" };
  if (!Number.isFinite(newMaxBidCpm) || newMaxBidCpm <= 0) {
    return { success: false, error: "Max bid CPM must be greater than zero" };
  }

  const existing = await findOwnedCampaign(builderId, campaignId);
  if (!existing) return { success: false, error: "Campaign not found" };
  if (existing.status !== "live" && existing.status !== "approved") {
    return { success: false, error: "Only live or approved campaigns can have their bid updated this way" };
  }

  const updated = await prisma.adCampaign.update({
    where: { id: campaignId },
    data: { maxBidCpm: newMaxBidCpm },
    include: campaignInclude,
  });

  return { success: true, campaign: toCampaignRow(updated) };
}

/** Admin-side approve/reject of a submitted campaign (mirrors projects/[id]/approval/route.ts). */
export async function decideAdCampaign(
  campaignId: number,
  action: "approve" | "reject",
  rejectionReason?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isDatabaseEnabled()) return { success: false, error: "Database disabled" };

  const existing = await prisma.adCampaign.findUnique({ where: { id: campaignId } });
  if (!existing) return { success: false, error: "Campaign not found" };
  if (existing.status !== "submitted") {
    return { success: false, error: `Campaign is not pending review (status: ${existing.status})` };
  }

  if (action === "reject") {
    const reason = rejectionReason?.trim();
    if (!reason) return { success: false, error: "Rejection reason is required" };
    await prisma.adCampaign.update({
      where: { id: campaignId },
      data: { status: "rejected", rejectionReason: reason },
    });
    createNotification({
      recipientType: "builder",
      recipientId: existing.builderId,
      type: "ad_campaign_reviewed",
      title: "Ad campaign rejected",
      message: `Your campaign "${existing.title}" was rejected: ${reason}`,
      link: `/advertising/campaigns/${campaignId}`,
    }).catch(() => {});
    return { success: true };
  }

  await prisma.adCampaign.update({
    where: { id: campaignId },
    data: { status: "approved", rejectionReason: null },
  });
  createNotification({
    recipientType: "builder",
    recipientId: existing.builderId,
    type: "ad_campaign_reviewed",
    title: "Ad campaign approved",
    message: `Your campaign "${existing.title}" was approved and will go live per its schedule.`,
    link: `/advertising/campaigns/${campaignId}`,
  }).catch(() => {});
  return { success: true };
}

/**
 * Admin-only soft-remove — pulls a campaign out of the auction/serving path entirely,
 * regardless of its status, without deleting its spend/audit history (unlike a hard delete,
 * which would orphan wallet transactions, daily stats, and notification records tied to it).
 * Reversible: unarchiving just clears the flag, ranking picks it back up on the next auction run.
 */
export async function setAdCampaignArchived(
  campaignId: number,
  archived: boolean
): Promise<{ success: boolean; error?: string }> {
  if (!isDatabaseEnabled()) return { success: false, error: "Database disabled" };

  const existing = await prisma.adCampaign.findUnique({ where: { id: campaignId } });
  if (!existing) return { success: false, error: "Campaign not found" };

  await prisma.adCampaign.update({
    where: { id: campaignId },
    data: { isArchive: archived },
  });

  if (archived) {
    // Stop serving immediately rather than waiting for the slot to naturally expire or for
    // the next auction run to notice the isArchive flag — same reasoning as the auction
    // script's exhausted-campaign cleanup.
    await prisma.adSlotAllocation.deleteMany({ where: { campaignId } });
  }

  return { success: true };
}

export async function notifyAdCampaignUsers(
  campaignId: number,
  userIds: number[],
  session: AdminSession
): Promise<{ count: number; error?: string }> {
  if (!isDatabaseEnabled()) return { count: 0, error: "Database disabled" };
  if (!userIds.length) return { count: 0, error: "No users selected" };

  const campaign = await prisma.adCampaign.findUnique({
    where: { id: campaignId },
    select: { id: true, title: true },
  });
  if (!campaign) return { count: 0, error: "Campaign not found" };

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, userTypeId: true },
  });

  await Promise.all(
    users.map(async (u) => {
      const recipient = await resolveRecipientForUser(u.id, u.userTypeId);
      await createNotification({
        recipientType: recipient.type,
        recipientId: recipient.id,
        actorType: "admin",
        actorId: session.id,
        type: "ad_campaign",
        title: `Ad campaign: ${campaign.title}`,
        message: `There's an update on the ad campaign "${campaign.title}".`,
        link: `/advertising/campaigns/${campaign.id}`,
      });
    })
  );

  return { count: users.length };
}

export type AdCampaignRefundEligibility = {
  campaignId: number;
  status: string;
  impressions: number;
  spend: number;
  undeliveredValue: number;
  refundedAt: string | null;
  refundAmount: number | null;
};

/**
 * Undelivered value = what the builder would have paid for the impressions/budget that never
 * got delivered before the campaign ended — impression-based if an impressionCap was set
 * (undelivered units × the bid rate), otherwise budget-based (unspent portion of budgetCap).
 * Zero for a campaign that fully exhausted its cap — there's nothing to refund there.
 */
export function computeUndeliveredValue(
  campaign: { impressionCap: number | null; budgetCap: unknown; maxBidCpm: unknown },
  impressions: number,
  spend: number
): number {
  if (campaign.impressionCap != null && campaign.impressionCap > 0) {
    const undeliveredUnits = Math.max(0, campaign.impressionCap - impressions);
    return Math.round(((undeliveredUnits * Number(campaign.maxBidCpm)) / 1000) * 100) / 100;
  }
  return Math.round(Math.max(0, Number(campaign.budgetCap) - spend) * 100) / 100;
}

/** Admin-facing preview of what a "completed" campaign's refund would be, before triggering it. */
export async function getAdCampaignRefundEligibility(
  campaignId: number
): Promise<AdCampaignRefundEligibility | null> {
  if (!isDatabaseEnabled()) return null;
  const campaign = await prisma.adCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return null;

  const agg = await prisma.adDailyStat.aggregate({
    where: { campaignId },
    _sum: { impressions: true, spend: true },
  });
  const impressions = agg._sum.impressions ?? 0;
  const spend = Number(agg._sum.spend ?? 0);

  return {
    campaignId,
    status: campaign.status,
    impressions,
    spend,
    undeliveredValue:
      campaign.status === "completed" ? computeUndeliveredValue(campaign, impressions, spend) : 0,
    refundedAt: campaign.refundedAt ? campaign.refundedAt.toISOString() : null,
    refundAmount: campaign.refundAmount != null ? Number(campaign.refundAmount) : null,
  };
}

/**
 * Admin-triggered only — never automatic (see docs/ADVERTISING_PORTAL_PRD.md Phase 3). An admin
 * reviews a completed campaign's undelivered value and explicitly decides to credit it back to
 * the builder's wallet, where it can fund any future campaign (a wallet credit is inherently a
 * "rollover" — there's no separate cash-refund vs. rollover distinction in this wallet model).
 */
export async function issueAdCampaignRefund(
  campaignId: number,
  actor: AdWalletActor
): Promise<{ success: boolean; amount?: number; error?: string }> {
  if (!isDatabaseEnabled()) return { success: false, error: "Database disabled" };

  const campaign = await prisma.adCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { success: false, error: "Campaign not found" };
  if (campaign.status !== "completed") {
    return { success: false, error: "Only completed campaigns can be refunded" };
  }
  if (campaign.refundedAt) {
    return { success: false, error: "A refund has already been issued for this campaign" };
  }

  const agg = await prisma.adDailyStat.aggregate({
    where: { campaignId },
    _sum: { impressions: true, spend: true },
  });
  const impressions = agg._sum.impressions ?? 0;
  const spend = Number(agg._sum.spend ?? 0);
  const amount = computeUndeliveredValue(campaign, impressions, spend);
  if (amount <= 0) {
    return { success: false, error: "Nothing to refund. This campaign fully delivered" };
  }

  // Claim the refund (refundedAt still null) inside the transaction so a double-click or two
  // admins at once can't both pass the refundedAt check above and credit twice.
  const refunded = await prisma.$transaction(async (tx) => {
    const claimed = await tx.adCampaign.updateMany({
      where: { id: campaignId, refundedAt: null },
      data: { refundedAt: new Date(), refundAmount: amount },
    });
    if (claimed.count === 0) return false;
    const wallet = await tx.adWallet.upsert({
      where: { builderId: campaign.builderId },
      create: { builderId: campaign.builderId },
      update: {},
    });
    const updatedWallet = await tx.adWallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: amount } },
    });
    await tx.adWalletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "refund_undelivered",
        amount,
        balanceAfter: updatedWallet.balance,
        status: "confirmed",
        referenceNote: `Refund for undelivered impressions on campaign #${campaign.id} (${campaign.title})`,
        confirmedByActorSource: actor.source,
        confirmedByActorId: actor.id,
      },
    });
    return true;
  });
  if (!refunded) {
    return { success: false, error: "A refund has already been issued for this campaign" };
  }

  createNotification({
    recipientType: "builder",
    recipientId: campaign.builderId,
    type: "ad_campaign_reviewed",
    title: "Refund issued for undelivered impressions",
    message: `Rs. ${amount.toLocaleString()} was credited to your wallet for undelivered impressions on "${campaign.title}".`,
    link: `/advertising/campaigns/${campaignId}`,
  }).catch(() => {});

  return { success: true, amount };
}

export type AdCampaignFormOptions = {
  projects: Array<{ id: number; name: string }>;
  areas: Array<{ id: number; name: string }>;
  projectTypes: Array<{ id: number; title: string }>;
  tiers: readonly string[];
};

/** Feeds the create/edit campaign form: builder's own projects + full area/property-type taxonomy. */
export async function loadAdCampaignFormOptions(builderId: number): Promise<AdCampaignFormOptions> {
  if (!isDatabaseEnabled()) return { projects: [], areas: [], projectTypes: [], tiers: AD_CAMPAIGN_TIERS };

  const [owned, areas, projectTypes] = await Promise.all([
    prisma.projectOwner.findMany({
      where: { builderId, project: { isArchive: false } },
      select: { project: { select: { id: true, name: true } } },
    }),
    prisma.area.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.projectType.findMany({
      where: { isArchive: false },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  return {
    projects: owned.map((o) => ({ id: o.project.id, name: o.project.name })),
    areas: areas.map((a) => ({ id: Number(a.id), name: a.name })),
    projectTypes,
    tiers: AD_CAMPAIGN_TIERS,
  };
}

/** A builder needs this many previously-approved campaigns, and zero rejections ever, to skip manual review. */
const TRUST_TIER_MIN_APPROVED_CAMPAIGNS = 3;

/**
 * Trust-tier auto-approval (Phase 3): a builder with a clean track record — several campaigns
 * that made it through review, never one rejected — skips the manual admin-review queue
 * entirely. Deliberately conservative and simple (a hardcoded threshold, not admin-configurable
 * yet) rather than a fuller reputation model; the goal is to remove review friction for
 * obviously-established builders, not to build a general-purpose trust system.
 */
async function builderIsTrusted(builderId: number): Promise<boolean> {
  const [approvedCount, rejectedCount] = await Promise.all([
    prisma.adCampaign.count({
      where: { builderId, status: { in: ["approved", "live", "completed"] } },
    }),
    prisma.adCampaign.count({ where: { builderId, status: "rejected" } }),
  ]);
  return approvedCount >= TRUST_TIER_MIN_APPROVED_CAMPAIGNS && rejectedCount === 0;
}

export async function submitAdCampaign(
  builderId: number,
  campaignId: number
): Promise<{ success: boolean; campaign?: AdCampaignRow; autoApproved?: boolean; error?: string }> {
  if (!isDatabaseEnabled()) return { success: false, error: "Database disabled" };

  const existing = await findOwnedCampaign(builderId, campaignId);
  if (!existing) return { success: false, error: "Campaign not found" };
  if (existing.status !== "draft") {
    return { success: false, error: `Campaign already ${existing.status}` };
  }

  const validationError = validateCampaignInput({
    projectId: existing.projectId,
    placementType: existing.placementType as AdPlacementType,
    title: existing.title,
    maxBidCpm: Number(existing.maxBidCpm),
    budgetCap: Number(existing.budgetCap),
    impressionCap: existing.impressionCap,
    startDate: existing.startDate,
    endDate: existing.endDate,
    areaIds: existing.areas.map((a) => a.areaId.toString()),
    projectTypeIds: existing.projectTypes.map((t) => t.projectTypeId),
    tiers: existing.tiers.map((t) => t.tier),
  });
  if (validationError) return { success: false, error: validationError };

  const autoApproved = await builderIsTrusted(builderId);

  const campaign = await prisma.adCampaign.update({
    where: { id: campaignId },
    data: { status: autoApproved ? "approved" : "submitted" },
    include: campaignInclude,
  });

  if (autoApproved) {
    createNotification({
      recipientType: "builder",
      recipientId: builderId,
      type: "ad_campaign_reviewed",
      title: "Ad campaign auto-approved",
      message: `Your campaign "${campaign.title}" was approved automatically based on your track record and will go live per its schedule.`,
      link: `/advertising/campaigns/${campaignId}`,
    }).catch(() => {});
  }

  return { success: true, campaign: toCampaignRow(campaign), autoApproved };
}
