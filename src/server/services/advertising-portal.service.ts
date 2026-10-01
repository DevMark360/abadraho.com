import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { getOrCreateAdWallet, type AdWalletSummary } from "@/server/services/advertising-wallet.service";

export type AdvertisingCampaignSummary = {
  id: number;
  projectId: number;
  projectName: string;
  projectSlug: string;
  placementType: string;
  title: string;
  status: string;
  isArchive: boolean;
  maxBidCpm: number;
  budgetCap: number;
  startDate: string;
  endDate: string;
  impressions: number;
  clicks: number;
  spend: number;
};

export type AdvertisingDashboardData = {
  builderId: number;
  wallet: AdWalletSummary;
  stats: {
    totalCampaigns: number;
    pendingReview: number;
    active: number;
    totalImpressions: number;
    totalClicks: number;
    totalSpend: number;
    totalInquiries: number;
    ctr: number;
  };
  recentCampaigns: AdvertisingCampaignSummary[];
};

export async function loadAdvertisingDashboard(
  builderId: number
): Promise<AdvertisingDashboardData | null> {
  if (!isDatabaseEnabled()) return null;

  const [wallet, campaigns, totalCampaigns, pendingReview, active, perfAgg] = await Promise.all([
    getOrCreateAdWallet(builderId),
    prisma.adCampaign.findMany({
      where: { builderId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { project: { select: { name: true, slug: true } } },
    }),
    prisma.adCampaign.count({ where: { builderId } }),
    prisma.adCampaign.count({ where: { builderId, status: "submitted" } }),
    prisma.adCampaign.count({
      where: { builderId, status: { in: ["approved", "live"] }, isArchive: false },
    }),
    prisma.adDailyStat.aggregate({
      where: { campaign: { builderId } },
      _sum: { impressions: true, clicks: true, spend: true, inquiries: true },
    }),
  ]);

  const campaignIds = campaigns.map((c) => c.id);
  const perCampaignStats = campaignIds.length
    ? await prisma.adDailyStat.groupBy({
        by: ["campaignId"],
        where: { campaignId: { in: campaignIds } },
        _sum: { impressions: true, clicks: true, spend: true },
      })
    : [];
  const statsByCampaign = new Map(
    perCampaignStats.map((s) => [
      s.campaignId,
      {
        impressions: s._sum.impressions ?? 0,
        clicks: s._sum.clicks ?? 0,
        spend: Number(s._sum.spend ?? 0),
      },
    ])
  );

  const totalImpressions = perfAgg._sum.impressions ?? 0;
  const totalClicks = perfAgg._sum.clicks ?? 0;

  return {
    builderId,
    wallet,
    stats: {
      totalCampaigns,
      pendingReview,
      active,
      totalImpressions,
      totalClicks,
      totalSpend: Number(perfAgg._sum.spend ?? 0),
      totalInquiries: perfAgg._sum.inquiries ?? 0,
      ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
    },
    recentCampaigns: campaigns.map((c) => {
      const perf = statsByCampaign.get(c.id) ?? { impressions: 0, clicks: 0, spend: 0 };
      return {
        id: c.id,
        projectId: c.projectId,
        projectName: c.project.name,
        projectSlug: c.project.slug,
        placementType: c.placementType,
        title: c.title,
        status: c.status,
        isArchive: c.isArchive,
        maxBidCpm: Number(c.maxBidCpm),
        budgetCap: Number(c.budgetCap),
        startDate: c.startDate.toISOString(),
        endDate: c.endDate.toISOString(),
        impressions: perf.impressions,
        clicks: perf.clicks,
        spend: perf.spend,
      };
    }),
  };
}
