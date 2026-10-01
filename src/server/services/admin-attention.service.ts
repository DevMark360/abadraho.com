import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { countPendingAssignmentRequests } from "@/server/services/broker-agent-ops.service";

export type AttentionItem = {
  key: string;
  label: string;
  count: number;
  href: string;
  /** Button text on the row — always navigates to the real queue for a human decision (never
   * a blind bulk-mutate from the dashboard), just labeled by what that queue lets you do. */
  actionLabel: string;
};

/**
 * Real, actionable queues only — every count here maps to a genuine "someone is waiting on a
 * decision" state already in the schema (AdCampaign/AdWalletTransaction/Review/Event status,
 * BrokerAssignmentRequest). Deliberately excludes anything without a real pending/actioned
 * state (e.g. inquiries have no read/unread flag) rather than inventing one.
 */
export async function getAttentionItems(): Promise<AttentionItem[]> {
  if (!isDatabaseEnabled()) return [];

  const [campaigns, walletTopUps, brokerRequests, reviews, events] = await Promise.all([
    // Archiving only sets isArchive, never status — an archived-but-still-"submitted" campaign
    // shouldn't linger in the approval queue forever.
    prisma.adCampaign.count({ where: { status: "submitted", isArchive: false } }).catch(() => 0),
    prisma.adWalletTransaction.count({ where: { status: "pending" } }).catch(() => 0),
    countPendingAssignmentRequests().catch(() => 0),
    prisma.review.count({ where: { status: "pending" } }).catch(() => 0),
    prisma.event.count({ where: { status: "pending" } }).catch(() => 0),
  ]);

  const items: AttentionItem[] = [
    { key: "campaigns", label: "Ad campaigns awaiting approval", count: campaigns, href: "/admin/ad-campaigns", actionLabel: "Review" },
    { key: "wallet", label: "Wallet top-ups awaiting confirmation", count: walletTopUps, href: "/admin/ad-wallet-transactions", actionLabel: "Confirm" },
    { key: "brokerRequests", label: "Broker assignment requests", count: brokerRequests, href: "/admin/broker-assignment-requests", actionLabel: "Assign" },
    { key: "reviews", label: "Reviews awaiting moderation", count: reviews, href: "/admin/reviews", actionLabel: "Moderate" },
    { key: "events", label: "Events awaiting approval", count: events, href: "/admin/events", actionLabel: "Review" },
  ];

  return items.filter((item) => item.count > 0);
}
