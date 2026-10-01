import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { computeUndeliveredValue } from "@/server/services/advertising-campaign.service";

export type AdminAdCampaignRow = {
  id: number;
  builderId: number;
  builderName: string;
  projectId: number;
  projectName: string;
  placementType: string;
  title: string;
  status: string;
  rejectionReason: string | null;
  maxBidCpm: number;
  budgetCap: number;
  impressionCap: number | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  /** Only meaningful for status "completed" — what an admin-triggered refund would credit right now. */
  undeliveredValue: number;
  refundedAt: string | null;
  refundAmount: number | null;
  isArchive: boolean;
};

export async function listAdminAdCampaigns(options?: {
  page?: number;
  perPage?: number;
  status?: string;
  /** Archived campaigns are hidden from the default view — pass true to see them instead. */
  showArchived?: boolean;
}): Promise<{ items: AdminAdCampaignRow[]; total: number }> {
  if (!isDatabaseEnabled()) return { items: [], total: 0 };

  const page = Math.max(1, options?.page ?? 1);
  const perPage = Math.min(100, Math.max(1, options?.perPage ?? 25));
  const where = {
    ...(options?.status ? { status: options.status } : {}),
    isArchive: Boolean(options?.showArchived),
  };

  const [rows, total] = await Promise.all([
    prisma.adCampaign.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        builder: { select: { fullName: true } },
        project: { select: { name: true } },
      },
    }),
    prisma.adCampaign.count({ where }),
  ]);

  const completedIds = rows.filter((r) => r.status === "completed" && !r.refundedAt).map((r) => r.id);
  const statsByCampaign = completedIds.length
    ? await prisma.adDailyStat.groupBy({
        by: ["campaignId"],
        where: { campaignId: { in: completedIds } },
        _sum: { impressions: true, spend: true },
      })
    : [];
  const statsMap = new Map(
    statsByCampaign.map((s) => [s.campaignId, { impressions: s._sum.impressions ?? 0, spend: Number(s._sum.spend ?? 0) }])
  );

  return {
    items: rows.map((r) => {
      const stats = statsMap.get(r.id);
      const undeliveredValue =
        r.status === "completed" && !r.refundedAt && stats
          ? computeUndeliveredValue(r, stats.impressions, stats.spend)
          : 0;
      return {
        id: r.id,
        builderId: r.builderId,
        builderName: r.builder.fullName,
        projectId: r.projectId,
        projectName: r.project.name,
        placementType: r.placementType,
        title: r.title,
        status: r.status,
        rejectionReason: r.rejectionReason,
        maxBidCpm: Number(r.maxBidCpm),
        budgetCap: Number(r.budgetCap),
        impressionCap: r.impressionCap,
        startDate: r.startDate.toISOString(),
        endDate: r.endDate.toISOString(),
        createdAt: r.createdAt.toISOString(),
        undeliveredValue,
        isArchive: r.isArchive,
        refundedAt: r.refundedAt ? r.refundedAt.toISOString() : null,
        refundAmount: r.refundAmount != null ? Number(r.refundAmount) : null,
      };
    }),
    total,
  };
}

export type AdminAdCampaignDetail = AdminAdCampaignRow & {
  creativeUrl: string | null;
  dailyBudget: number | null;
  qualityScore: number;
  pausedReason: string | null;
  pausedDate: string | null;
  targeting: {
    areas: string[];
    projectTypes: string[];
    tiers: string[];
    /** True when no area/project-type/tier is targeted — the campaign runs on the home page
     * (see campaign-new-client.tsx's "show on homepage" checkbox, which clears these arrays). */
    showOnHomepage: boolean;
  };
  stats: { impressions: number; clicks: number; spend: number; inquiries: number };
};

/** Full detail for the admin "View" modal — everything listAdminAdCampaigns leaves out for the
 * table view (creative, targeting, lifetime stats, pause/quality-score internals). */
export async function getAdminAdCampaignDetail(campaignId: number): Promise<AdminAdCampaignDetail | null> {
  if (!isDatabaseEnabled()) return null;

  const campaign = await prisma.adCampaign.findUnique({
    where: { id: campaignId },
    include: {
      builder: { select: { fullName: true } },
      project: { select: { name: true } },
      areas: { include: { area: { select: { name: true } } } },
      projectTypes: { include: { projectType: { select: { title: true } } } },
      tiers: true,
    },
  });
  if (!campaign) return null;

  const statsAgg = await prisma.adDailyStat.aggregate({
    where: { campaignId },
    _sum: { impressions: true, clicks: true, spend: true, inquiries: true },
  });
  const impressions = statsAgg._sum.impressions ?? 0;
  const spend = Number(statsAgg._sum.spend ?? 0);
  const undeliveredValue =
    campaign.status === "completed" && !campaign.refundedAt
      ? computeUndeliveredValue(campaign, impressions, spend)
      : 0;

  const areas = campaign.areas.map((a) => a.area.name);
  const projectTypes = campaign.projectTypes.map((pt) => pt.projectType.title);
  const tiers = campaign.tiers.map((t) => t.tier);

  return {
    id: campaign.id,
    builderId: campaign.builderId,
    builderName: campaign.builder.fullName,
    projectId: campaign.projectId,
    projectName: campaign.project.name,
    placementType: campaign.placementType,
    title: campaign.title,
    creativeUrl: campaign.creativeUrl,
    status: campaign.status,
    rejectionReason: campaign.rejectionReason,
    pausedReason: campaign.pausedReason,
    pausedDate: campaign.pausedDate ? campaign.pausedDate.toISOString() : null,
    maxBidCpm: Number(campaign.maxBidCpm),
    budgetCap: Number(campaign.budgetCap),
    dailyBudget: campaign.dailyBudget != null ? Number(campaign.dailyBudget) : null,
    impressionCap: campaign.impressionCap,
    qualityScore: Number(campaign.qualityScore),
    startDate: campaign.startDate.toISOString(),
    endDate: campaign.endDate.toISOString(),
    createdAt: campaign.createdAt.toISOString(),
    undeliveredValue,
    isArchive: campaign.isArchive,
    refundedAt: campaign.refundedAt ? campaign.refundedAt.toISOString() : null,
    refundAmount: campaign.refundAmount != null ? Number(campaign.refundAmount) : null,
    targeting: {
      areas,
      projectTypes,
      tiers,
      showOnHomepage: areas.length === 0 && projectTypes.length === 0 && tiers.length === 0,
    },
    stats: {
      impressions,
      clicks: statsAgg._sum.clicks ?? 0,
      spend,
      inquiries: statsAgg._sum.inquiries ?? 0,
    },
  };
}

export type AdminAdWalletTransactionRow = {
  id: number;
  walletId: number;
  builderId: number;
  builderName: string;
  type: string;
  amount: number;
  status: string;
  referenceNote: string | null;
  createdAt: string;
};

export async function listAdminAdWalletTransactions(options?: {
  page?: number;
  perPage?: number;
  status?: string;
}): Promise<{ items: AdminAdWalletTransactionRow[]; total: number }> {
  if (!isDatabaseEnabled()) return { items: [], total: 0 };

  const page = Math.max(1, options?.page ?? 1);
  const perPage = Math.min(100, Math.max(1, options?.perPage ?? 25));
  const where = options?.status ? { status: options.status } : {};

  const [rows, total] = await Promise.all([
    prisma.adWalletTransaction.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        wallet: { select: { builderId: true, builder: { select: { fullName: true } } } },
      },
    }),
    prisma.adWalletTransaction.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      walletId: r.walletId,
      builderId: r.wallet.builderId,
      builderName: r.wallet.builder.fullName,
      type: r.type,
      amount: Number(r.amount),
      status: r.status,
      referenceNote: r.referenceNote,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
  };
}
