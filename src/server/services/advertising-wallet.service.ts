import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { createNotification } from "@/server/services/notification.service";

export type AdWalletTransactionType =
  | "topup_bank_transfer"
  | "topup_jazzcash"
  | "spend"
  | "whatsapp_package_purchase"
  | "refund_undelivered"
  | "adjustment";
export type AdWalletTransactionStatus = "pending" | "confirmed" | "rejected";

export type AdWalletSummary = {
  id: number;
  builderId: number;
  balance: number;
  updatedAt: string;
};

export type AdWalletTransactionRow = {
  id: number;
  type: string;
  amount: number;
  balanceAfter: number | null;
  referenceNote: string | null;
  status: string;
  confirmedByActorSource: string | null;
  confirmedByActorId: number | null;
  createdAt: string;
};

function toWalletSummary(wallet: {
  id: number;
  builderId: number;
  balance: unknown;
  updatedAt: Date;
}): AdWalletSummary {
  return {
    id: wallet.id,
    builderId: wallet.builderId,
    balance: Number(wallet.balance),
    updatedAt: wallet.updatedAt.toISOString(),
  };
}

/** Every builder gets a wallet lazily on first access rather than at account creation. */
export async function getOrCreateAdWallet(builderId: number): Promise<AdWalletSummary> {
  const wallet = await prisma.adWallet.upsert({
    where: { builderId },
    create: { builderId },
    update: {},
  });
  return toWalletSummary(wallet);
}

export async function getAdWalletBalance(builderId: number): Promise<AdWalletSummary | null> {
  if (!isDatabaseEnabled()) return null;
  return getOrCreateAdWallet(builderId);
}

/** Builder-submitted bank-transfer reference; stays "pending" until an admin confirms it (see Milestone 2.3). */
export async function submitAdWalletTopUp(
  builderId: number,
  input: { amount: number; referenceNote: string }
): Promise<{ success: boolean; transaction?: AdWalletTransactionRow; error?: string }> {
  if (!isDatabaseEnabled()) return { success: false, error: "Database disabled" };

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { success: false, error: "Amount must be greater than zero" };
  }
  const referenceNote = input.referenceNote?.trim();
  if (!referenceNote) {
    return { success: false, error: "Bank transfer reference is required" };
  }

  const wallet = await getOrCreateAdWallet(builderId);
  const transaction = await prisma.adWalletTransaction.create({
    data: {
      walletId: wallet.id,
      type: "topup_bank_transfer",
      amount: input.amount,
      referenceNote,
      status: "pending",
    },
  });

  return {
    success: true,
    transaction: {
      id: transaction.id,
      type: transaction.type,
      amount: Number(transaction.amount),
      balanceAfter: null,
      referenceNote: transaction.referenceNote,
      status: transaction.status,
      confirmedByActorSource: transaction.confirmedByActorSource,
      confirmedByActorId: transaction.confirmedByActorId,
      createdAt: transaction.createdAt.toISOString(),
    },
  };
}

export type AdWalletActor = { source: "admin" | "user"; id: number };

/** Admin-side confirm/reject of a pending bank-transfer top-up (mirrors projects/[id]/approval/route.ts). */
export async function decideAdWalletTransaction(
  transactionId: number,
  action: "confirm" | "reject",
  actor: AdWalletActor
): Promise<{ success: boolean; error?: string; balance?: number }> {
  if (!isDatabaseEnabled()) return { success: false, error: "Database disabled" };

  const transaction = await prisma.adWalletTransaction.findUnique({
    where: { id: transactionId },
    include: { wallet: { select: { builderId: true } } },
  });
  if (!transaction) return { success: false, error: "Transaction not found" };
  if (transaction.status !== "pending") {
    return { success: false, error: `Transaction already ${transaction.status}` };
  }

  if (action === "reject") {
    await prisma.adWalletTransaction.update({
      where: { id: transactionId },
      data: {
        status: "rejected",
        confirmedByActorSource: actor.source,
        confirmedByActorId: actor.id,
      },
    });
    createNotification({
      recipientType: "builder",
      recipientId: transaction.wallet.builderId,
      type: "ad_wallet_transaction_reviewed",
      title: "Wallet top-up rejected",
      message: `Your top-up of Rs. ${Number(transaction.amount).toLocaleString()} was rejected.`,
      link: "/advertising/wallet",
    }).catch(() => {});
    return { success: true };
  }

  const wallet = await prisma.$transaction(async (tx) => {
    const updatedWallet = await tx.adWallet.update({
      where: { id: transaction.walletId },
      data: { balance: { increment: transaction.amount } },
    });
    await tx.adWalletTransaction.update({
      where: { id: transactionId },
      data: {
        status: "confirmed",
        balanceAfter: updatedWallet.balance,
        confirmedByActorSource: actor.source,
        confirmedByActorId: actor.id,
      },
    });
    return updatedWallet;
  });

  createNotification({
    recipientType: "builder",
    recipientId: transaction.wallet.builderId,
    type: "ad_wallet_transaction_reviewed",
    title: "Wallet top-up confirmed",
    message: `Your top-up of Rs. ${Number(transaction.amount).toLocaleString()} was confirmed. New balance: Rs. ${Number(wallet.balance).toLocaleString()}.`,
    link: "/advertising/wallet",
  }).catch(() => {});

  return { success: true, balance: Number(wallet.balance) };
}

export async function listAdWalletTransactions(
  builderId: number,
  options?: { page?: number; pageSize?: number }
): Promise<{ items: AdWalletTransactionRow[]; total: number; page: number; pageSize: number }> {
  if (!isDatabaseEnabled()) {
    return { items: [], total: 0, page: 1, pageSize: 20 };
  }

  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options?.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const wallet = await getOrCreateAdWallet(builderId);

  const [rows, total] = await Promise.all([
    prisma.adWalletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.adWalletTransaction.count({ where: { walletId: wallet.id } }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      type: r.type,
      amount: Number(r.amount),
      balanceAfter: r.balanceAfter != null ? Number(r.balanceAfter) : null,
      referenceNote: r.referenceNote,
      status: r.status,
      confirmedByActorSource: r.confirmedByActorSource,
      confirmedByActorId: r.confirmedByActorId,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}
