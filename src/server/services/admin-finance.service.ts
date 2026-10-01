import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { queryRaw } from "@/lib/prisma-raw";
import { jsonNum } from "@/lib/prisma-json";

export type FinanceBreakdownRow = { label: string; amount: number; count: number };
export type FinanceBuilderRow = {
  builderId: number;
  builderName: string;
  amount: number;
  count: number;
};
export type FinanceCommissionRow = {
  brokerName: string;
  amount: number;
  paidAt: string;
  paymentReference: string | null;
};

export type FinanceCollectionDetail = {
  id: number;
  builderName: string;
  type: string;
  amount: number;
  date: string;
};
export type FinanceRefundDetail = {
  id: number;
  builderName: string;
  campaignTitle: string | null;
  amount: number;
  date: string;
};
export type FinanceEarnedDetail = {
  id: string;
  builderName: string;
  campaignTitle: string | null;
  amount: number;
  date: string;
};

/** How many recent rows each card's detail dropdown fetches — enough for a scrollable list
 * without pulling the full ledger on every dashboard load. */
const DETAIL_ROW_LIMIT = 50;

export type FinanceSummary = {
  collections: {
    bySource: FinanceBreakdownRow[];
    totalAllTime: number;
    totalThisMonth: number;
    recent: FinanceCollectionDetail[];
  };
  refunds: {
    byBuilder: FinanceBuilderRow[];
    totalAllTime: number;
    totalThisMonth: number;
    recent: FinanceRefundDetail[];
  };
  /** Collected minus refunded — the net cash admin is actually holding, before accounting for
   * what's still owed back to builders as unspent wallet balance vs. already earned. */
  netAvailable: {
    totalAllTime: number;
    totalThisMonth: number;
  };
  earned: {
    adSpendAllTime: number;
    adSpendThisMonth: number;
    whatsappPackagesAllTime: number;
    whatsappPackagesThisMonth: number;
    totalAllTime: number;
    totalThisMonth: number;
    recentAdSpend: FinanceEarnedDetail[];
    recentWhatsapp: FinanceEarnedDetail[];
  };
  currentWalletLiability: number;
  reconciliation: {
    expectedLiability: number;
    actualLiability: number;
    difference: number;
  };
  brokerCommissions: {
    pendingAmount: number;
    confirmedAmount: number;
    paidAmount: number;
    paidCount: number;
    recentPaid: FinanceCommissionRow[];
  };
};

const COLLECTION_SOURCE_LABELS: Record<string, string> = {
  topup_bank_transfer: "Bank transfer",
  topup_jazzcash: "JazzCash",
};

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function emptySummary(): FinanceSummary {
  return {
    collections: { bySource: [], totalAllTime: 0, totalThisMonth: 0, recent: [] },
    refunds: { byBuilder: [], totalAllTime: 0, totalThisMonth: 0, recent: [] },
    netAvailable: { totalAllTime: 0, totalThisMonth: 0 },
    earned: {
      adSpendAllTime: 0,
      adSpendThisMonth: 0,
      whatsappPackagesAllTime: 0,
      whatsappPackagesThisMonth: 0,
      totalAllTime: 0,
      totalThisMonth: 0,
      recentAdSpend: [],
      recentWhatsapp: [],
    },
    currentWalletLiability: 0,
    reconciliation: { expectedLiability: 0, actualLiability: 0, difference: 0 },
    brokerCommissions: { pendingAmount: 0, confirmedAmount: 0, paidAmount: 0, paidCount: 0, recentPaid: [] },
  };
}

/**
 * Reconciles the admin's side of ad-wallet money movement: what came in (confirmed top-ups, by
 * gateway), what went back out (confirmed refunds, by builder), and what was actually earned
 * (ad spend + WhatsApp package purchases — both silently decrement AdWallet.balance without a
 * matching transaction row, see recordAdSliceImpression). Collected − Refunded − Earned must
 * equal the current sum of AdWallet.balance by construction; the reconciliation block surfaces
 * any drift instead of leaving it implicit.
 */
export async function getFinanceSummary(): Promise<FinanceSummary> {
  if (!isDatabaseEnabled()) return emptySummary();

  const from = startOfMonth();

  const [
    collectionsAllTime,
    collectionsThisMonth,
    refundsByBuilderAllTime,
    refundsByBuilderThisMonth,
    adSpendAllTimeAgg,
    adSpendThisMonthAgg,
    whatsappAllTimeAgg,
    whatsappThisMonthAgg,
    walletAgg,
    commissionPendingAgg,
    commissionConfirmedAgg,
    commissionPaidAgg,
    commissionPaidCount,
    recentPaidRows,
    recentCollectionsRows,
    recentRefundsRows,
    recentAdSpendRows,
    recentWhatsappRows,
  ] = await Promise.all([
    prisma.adWalletTransaction.groupBy({
      by: ["type"],
      where: { type: { in: Object.keys(COLLECTION_SOURCE_LABELS) }, status: "confirmed" },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.adWalletTransaction.groupBy({
      by: ["type"],
      where: {
        type: { in: Object.keys(COLLECTION_SOURCE_LABELS) },
        status: "confirmed",
        createdAt: { gte: from },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
    queryRaw<{ builder_id: number; builder_name: string; total: unknown; cnt: unknown }[]>(
      `SELECT b.id AS builder_id, b.full_name AS builder_name, SUM(t.amount) AS total, COUNT(*) AS cnt
       FROM ad_wallet_transactions t
       JOIN ad_wallets w ON w.id = t.wallet_id
       JOIN builders b ON b.id = w.builder_id
       WHERE t.type = 'refund_undelivered' AND t.status = 'confirmed'
       GROUP BY b.id, b.full_name
       ORDER BY total DESC`
    ),
    queryRaw<{ builder_id: number; builder_name: string; total: unknown; cnt: unknown }[]>(
      `SELECT b.id AS builder_id, b.full_name AS builder_name, SUM(t.amount) AS total, COUNT(*) AS cnt
       FROM ad_wallet_transactions t
       JOIN ad_wallets w ON w.id = t.wallet_id
       JOIN builders b ON b.id = w.builder_id
       WHERE t.type = 'refund_undelivered' AND t.status = 'confirmed' AND t.created_at >= ?
       GROUP BY b.id, b.full_name
       ORDER BY total DESC`,
      from
    ),
    prisma.adDailyStat.aggregate({ _sum: { spend: true } }).catch(() => null),
    prisma.adDailyStat.aggregate({ where: { date: { gte: from } }, _sum: { spend: true } }).catch(() => null),
    prisma.adWalletTransaction
      .aggregate({ where: { type: "whatsapp_package_purchase", status: "confirmed" }, _sum: { amount: true } })
      .catch(() => null),
    prisma.adWalletTransaction
      .aggregate({
        where: { type: "whatsapp_package_purchase", status: "confirmed", createdAt: { gte: from } },
        _sum: { amount: true },
      })
      .catch(() => null),
    prisma.adWallet.aggregate({ _sum: { balance: true } }).catch(() => null),
    prisma.brokerCommission.aggregate({ where: { status: "pending" }, _sum: { commissionAmount: true } }).catch(() => null),
    prisma.brokerCommission.aggregate({ where: { status: "confirmed" }, _sum: { commissionAmount: true } }).catch(() => null),
    prisma.brokerCommission.aggregate({ where: { status: "paid" }, _sum: { commissionAmount: true } }).catch(() => null),
    prisma.brokerCommission.count({ where: { status: "paid" } }).catch(() => 0),
    prisma.brokerCommission.findMany({
      where: { status: "paid" },
      orderBy: { paidAt: "desc" },
      take: 10,
      include: { broker: { select: { contactPersonName: true, companyName: true } } },
    }),
    queryRaw<{ id: number; type: string; amount: unknown; created_at: Date; builder_name: string }[]>(
      `SELECT t.id, t.type, t.amount, t.created_at, b.full_name AS builder_name
       FROM ad_wallet_transactions t
       JOIN ad_wallets w ON w.id = t.wallet_id
       JOIN builders b ON b.id = w.builder_id
       WHERE t.type IN ('topup_bank_transfer', 'topup_jazzcash') AND t.status = 'confirmed'
       ORDER BY t.created_at DESC
       LIMIT ${DETAIL_ROW_LIMIT}`
    ),
    queryRaw<{ id: number; amount: unknown; created_at: Date; reference_note: string | null; builder_name: string }[]>(
      `SELECT t.id, t.amount, t.created_at, t.reference_note, b.full_name AS builder_name
       FROM ad_wallet_transactions t
       JOIN ad_wallets w ON w.id = t.wallet_id
       JOIN builders b ON b.id = w.builder_id
       WHERE t.type = 'refund_undelivered' AND t.status = 'confirmed'
       ORDER BY t.created_at DESC
       LIMIT ${DETAIL_ROW_LIMIT}`
    ),
    queryRaw<{ id: number; date: Date; spend: unknown; campaign_title: string; builder_name: string }[]>(
      `SELECT ds.id, ds.date, ds.spend, c.title AS campaign_title, b.full_name AS builder_name
       FROM ad_daily_stats ds
       JOIN ad_campaigns c ON c.id = ds.campaign_id
       JOIN builders b ON b.id = c.builder_id
       WHERE ds.spend > 0
       ORDER BY ds.date DESC, ds.id DESC
       LIMIT ${DETAIL_ROW_LIMIT}`
    ),
    queryRaw<{ id: number; amount: unknown; created_at: Date; builder_name: string }[]>(
      `SELECT t.id, t.amount, t.created_at, b.full_name AS builder_name
       FROM ad_wallet_transactions t
       JOIN ad_wallets w ON w.id = t.wallet_id
       JOIN builders b ON b.id = w.builder_id
       WHERE t.type = 'whatsapp_package_purchase' AND t.status = 'confirmed'
       ORDER BY t.created_at DESC
       LIMIT ${DETAIL_ROW_LIMIT}`
    ),
  ]);

  const toBreakdown = (rows: { type: string; _sum: { amount: unknown }; _count: { id: number } }[]): FinanceBreakdownRow[] =>
    rows.map((r) => ({
      label: COLLECTION_SOURCE_LABELS[r.type] ?? r.type,
      amount: Number(r._sum.amount ?? 0),
      count: r._count.id,
    }));

  const toBuilderRows = (rows: { builder_id: number; builder_name: string; total: unknown; cnt: unknown }[]): FinanceBuilderRow[] =>
    rows.map((r) => ({
      builderId: r.builder_id,
      builderName: r.builder_name,
      // refund_undelivered rows are stored as positive credits — show as a positive amount refunded.
      amount: Math.abs(jsonNum(r.total)),
      count: jsonNum(r.cnt),
    }));

  const collectionsBreakdown = toBreakdown(collectionsAllTime);
  const collectionsThisMonthBreakdown = toBreakdown(collectionsThisMonth);
  const refundsByBuilder = toBuilderRows(refundsByBuilderAllTime);
  const refundsByBuilderThisMonthRows = toBuilderRows(refundsByBuilderThisMonth);

  const recentCollections: FinanceCollectionDetail[] = recentCollectionsRows.map((r) => ({
    id: r.id,
    builderName: r.builder_name,
    type: COLLECTION_SOURCE_LABELS[r.type] ?? r.type,
    amount: jsonNum(r.amount),
    date: new Date(r.created_at).toISOString(),
  }));

  // referenceNote is written as "Refund for undelivered impressions on campaign #<id> (<title>)"
  // (see advertising-campaign.service.ts) — no separate campaignId column on this table, so the
  // title is pulled back out of the note text rather than added as new schema for a display-only need.
  const CAMPAIGN_TITLE_FROM_NOTE = /\(([^)]+)\)\s*$/;
  const recentRefunds: FinanceRefundDetail[] = recentRefundsRows.map((r) => ({
    id: r.id,
    builderName: r.builder_name,
    campaignTitle: r.reference_note?.match(CAMPAIGN_TITLE_FROM_NOTE)?.[1] ?? null,
    amount: Math.abs(jsonNum(r.amount)),
    date: new Date(r.created_at).toISOString(),
  }));

  const recentAdSpend: FinanceEarnedDetail[] = recentAdSpendRows.map((r) => ({
    id: `spend-${r.id}`,
    builderName: r.builder_name,
    campaignTitle: r.campaign_title,
    amount: jsonNum(r.spend),
    date: new Date(r.date).toISOString(),
  }));

  const recentWhatsapp: FinanceEarnedDetail[] = recentWhatsappRows.map((r) => ({
    id: `whatsapp-${r.id}`,
    builderName: r.builder_name,
    campaignTitle: null,
    amount: Math.abs(jsonNum(r.amount)),
    date: new Date(r.created_at).toISOString(),
  }));

  const totalCollectedAllTime = collectionsBreakdown.reduce((s, r) => s + r.amount, 0);
  const totalCollectedThisMonth = collectionsThisMonthBreakdown.reduce((s, r) => s + r.amount, 0);
  const totalRefundedAllTime = refundsByBuilder.reduce((s, r) => s + r.amount, 0);
  const totalRefundedThisMonth = refundsByBuilderThisMonthRows.reduce((s, r) => s + r.amount, 0);

  const adSpendAllTime = Number(adSpendAllTimeAgg?._sum.spend ?? 0);
  const adSpendThisMonth = Number(adSpendThisMonthAgg?._sum.spend ?? 0);
  // whatsapp_package_purchase rows are stored as negative amounts (a wallet debit).
  const whatsappAllTime = Math.abs(Number(whatsappAllTimeAgg?._sum.amount ?? 0));
  const whatsappThisMonth = Math.abs(Number(whatsappThisMonthAgg?._sum.amount ?? 0));

  const earnedAllTime = adSpendAllTime + whatsappAllTime;
  const earnedThisMonth = adSpendThisMonth + whatsappThisMonth;

  const actualLiability = Number(walletAgg?._sum.balance ?? 0);
  // refund_undelivered CREDITS the wallet (see advertising-campaign.service.ts's setAdCampaignArchived
  // / refund path — balance: { increment: amount }) — it's a wallet-credit adjustment for undelivered
  // impressions, not a real bank payout leaving admin's account, so it ADDS to what's still owed.
  const expectedLiability = totalCollectedAllTime + totalRefundedAllTime - earnedAllTime;

  return {
    collections: {
      bySource: collectionsBreakdown,
      totalAllTime: totalCollectedAllTime,
      totalThisMonth: totalCollectedThisMonth,
      recent: recentCollections,
    },
    refunds: {
      byBuilder: refundsByBuilder,
      totalAllTime: totalRefundedAllTime,
      totalThisMonth: totalRefundedThisMonth,
      recent: recentRefunds,
    },
    netAvailable: {
      totalAllTime: totalCollectedAllTime - totalRefundedAllTime,
      totalThisMonth: totalCollectedThisMonth - totalRefundedThisMonth,
    },
    earned: {
      adSpendAllTime,
      adSpendThisMonth,
      whatsappPackagesAllTime: whatsappAllTime,
      whatsappPackagesThisMonth: whatsappThisMonth,
      totalAllTime: earnedAllTime,
      totalThisMonth: earnedThisMonth,
      recentAdSpend,
      recentWhatsapp,
    },
    currentWalletLiability: actualLiability,
    reconciliation: {
      expectedLiability,
      actualLiability,
      difference: Number((expectedLiability - actualLiability).toFixed(2)),
    },
    brokerCommissions: {
      pendingAmount: Number(commissionPendingAgg?._sum.commissionAmount ?? 0),
      confirmedAmount: Number(commissionConfirmedAgg?._sum.commissionAmount ?? 0),
      paidAmount: Number(commissionPaidAgg?._sum.commissionAmount ?? 0),
      paidCount: commissionPaidCount,
      recentPaid: recentPaidRows.map((r) => ({
        brokerName: r.broker.contactPersonName ?? r.broker.companyName ?? "—",
        amount: Number(r.commissionAmount),
        paidAt: (r.paidAt ?? r.updatedAt ?? r.createdAt).toISOString(),
        paymentReference: r.paymentReference,
      })),
    },
  };
}
