import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { queryRaw } from "@/lib/prisma-raw";
import { jsonNum } from "@/lib/prisma-json";

export type CommercialSnapshot = {
  adSpendThisMonth: number;
  activeCampaigns: number;
  walletBalance: number;
  brokerCommissionsThisMonth: number;
  /** Total budgetCap across currently-live campaigns — "how much of what's allocated has
   * actually been spent this month," used as the gauge's goal. */
  liveCampaignBudget: number;
  campaignStatus: { active: number; paused: number; scheduled: number };
};

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/** Money-moving numbers across the Advertising Portal and broker program — the figures that
 * make this read as a real marketplace, not just a CRUD counter board. */
export async function getCommercialSnapshot(): Promise<CommercialSnapshot> {
  const empty: CommercialSnapshot = {
    adSpendThisMonth: 0,
    activeCampaigns: 0,
    walletBalance: 0,
    brokerCommissionsThisMonth: 0,
    liveCampaignBudget: 0,
    campaignStatus: { active: 0, paused: 0, scheduled: 0 },
  };
  if (!isDatabaseEnabled()) return empty;

  const from = startOfMonth();

  const [spendAgg, activeCampaigns, pausedCampaigns, scheduledCampaigns, walletAgg, commissionAgg, liveBudgetAgg] =
    await Promise.all([
      prisma.adDailyStat.aggregate({ where: { date: { gte: from } }, _sum: { spend: true } }).catch(() => null),
      // Archiving only sets isArchive — it never changes status away from "live"/"paused"/etc.,
      // so every campaign count here must exclude archived ones explicitly or a campaign an
      // admin/builder archived keeps showing as active forever.
      prisma.adCampaign.count({ where: { status: "live", isArchive: false } }).catch(() => 0),
      prisma.adCampaign.count({ where: { status: "paused", isArchive: false } }).catch(() => 0),
      // "Scheduled" = approved and ready, just waiting for its start date.
      prisma.adCampaign.count({ where: { status: "approved", isArchive: false } }).catch(() => 0),
      prisma.adWallet.aggregate({ _sum: { balance: true } }).catch(() => null),
      prisma.brokerCommission
        .aggregate({ where: { createdAt: { gte: from } }, _sum: { commissionAmount: true } })
        .catch(() => null),
      prisma.adCampaign
        .aggregate({ where: { status: "live", isArchive: false }, _sum: { budgetCap: true } })
        .catch(() => null),
    ]);

  return {
    adSpendThisMonth: Number(spendAgg?._sum.spend ?? 0),
    activeCampaigns,
    walletBalance: Number(walletAgg?._sum.balance ?? 0),
    brokerCommissionsThisMonth: Number(commissionAgg?._sum.commissionAmount ?? 0),
    liveCampaignBudget: Number(liveBudgetAgg?._sum.budgetCap ?? 0),
    campaignStatus: { active: activeCampaigns, paused: pausedCampaigns, scheduled: scheduledCampaigns },
  };
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDay(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Real daily ad spend for the last 30 days — the Commercial section only shows this month's
 * total as one number; this is the trend behind it. */
export async function getAdSpendTrend(): Promise<{ label: string; value: number }[]> {
  if (!isDatabaseEnabled()) return [];

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const from = new Date(now);
  from.setDate(from.getDate() - 29);

  const byDay = new Map<string, number>();
  try {
    const rows = await queryRaw<{ d: Date; total: unknown }[]>(
      `SELECT date AS d, SUM(spend) AS total FROM ad_daily_stats WHERE date >= ? GROUP BY date`,
      from
    );
    for (const r of rows) {
      byDay.set(localDateKey(new Date(r.d)), jsonNum(r.total));
    }
  } catch {
    return [];
  }

  const points: { label: string; value: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    points.push({ label: formatDay(d), value: byDay.get(localDateKey(d)) ?? 0 });
  }
  return points;
}
