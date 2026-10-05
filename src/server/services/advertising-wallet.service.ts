import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { createNotification } from "@/server/services/notification.service";
import {
  hasWalletProof,
  readWalletProof,
  saveWalletProof,
  type ValidatedProof,
} from "@/server/services/wallet-proof.service";

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
  /** Payer's bank/wallet transaction ID (manual top-ups only). */
  transactionId: string | null;
  hasProof: boolean;
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

/** Bank/JazzCash/Easypaisa transaction IDs: letters, digits and simple separators. */
const PAYER_TXN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._/-]{3,39}$/;
const TOPUP_MAX_AMOUNT = 10_000_000;

/**
 * Builder-submitted manual top-up (bank transfer / JazzCash / Easypaisa to the accounts in
 * .env). Stays "pending" until an admin checks the payment arrived and confirms it.
 * The payer's transaction ID goes in gateway_reference (unused for manual entries before),
 * which also lets us refuse the same receipt being submitted twice.
 */
export async function submitAdWalletTopUp(
  builderId: number,
  input: { amount: number; transactionId: string; referenceNote?: string; proof: ValidatedProof }
): Promise<{ success: boolean; transaction?: AdWalletTransactionRow; error?: string }> {
  if (!isDatabaseEnabled()) return { success: false, error: "Database disabled" };

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { success: false, error: "Amount must be greater than zero" };
  }
  if (input.amount > TOPUP_MAX_AMOUNT) {
    return { success: false, error: "Amount is too large. Check the figure or contact support" };
  }
  const transactionId = input.transactionId?.trim() ?? "";
  if (!PAYER_TXN_ID_PATTERN.test(transactionId)) {
    return {
      success: false,
      error: "Enter the transaction ID / reference number from your receipt (4–40 characters)",
    };
  }
  const referenceNote = input.referenceNote?.trim().slice(0, 500) || null;

  const duplicate = await prisma.adWalletTransaction.findFirst({
    where: {
      type: "topup_bank_transfer",
      gatewayReference: transactionId,
      status: { not: "rejected" },
    },
    select: { id: true },
  });
  if (duplicate) {
    return { success: false, error: "This transaction ID has already been submitted" };
  }

  const wallet = await getOrCreateAdWallet(builderId);
  const transaction = await prisma.adWalletTransaction.create({
    data: {
      walletId: wallet.id,
      type: "topup_bank_transfer",
      amount: input.amount,
      gatewayReference: transactionId,
      referenceNote,
      status: "pending",
    },
  });

  try {
    await saveWalletProof(transaction.id, input.proof);
  } catch (e) {
    console.error("[wallet] could not save payment proof", e);
    await prisma.adWalletTransaction.delete({ where: { id: transaction.id } }).catch(() => {});
    return { success: false, error: "Could not save the screenshot. Please try again." };
  }

  createNotification({
    recipientType: "admin",
    recipientId: 0,
    type: "ad_wallet_topup_submitted",
    title: "New wallet top-up to verify",
    message: `Rs. ${input.amount.toLocaleString()}, transaction ID ${transactionId}. Check the payment arrived, then confirm or reject.`,
    link: "/admin/ad-wallet-transactions",
  }).catch(() => {});

  return {
    success: true,
    transaction: {
      id: transaction.id,
      type: transaction.type,
      amount: Number(transaction.amount),
      balanceAfter: null,
      referenceNote: transaction.referenceNote,
      transactionId,
      hasProof: true,
      status: transaction.status,
      confirmedByActorSource: transaction.confirmedByActorSource,
      confirmedByActorId: transaction.confirmedByActorId,
      createdAt: transaction.createdAt.toISOString(),
    },
  };
}

/** Payer transaction ID — only manual top-ups store one meant for display. */
export function payerTransactionId(row: { type: string; gatewayReference: string | null }) {
  return row.type === "topup_bank_transfer" ? row.gatewayReference : null;
}

export type AdWalletActor = { source: "admin" | "user"; id: number };

/** Admin-side confirm/reject of a pending bank-transfer top-up (mirrors projects/[id]/approval/route.ts). */
export async function decideAdWalletTransaction(
  transactionId: number,
  action: "confirm" | "reject",
  actor: AdWalletActor,
  rejectReason?: string
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
    const reason = rejectReason?.trim().slice(0, 300);
    const rejected = await prisma.adWalletTransaction.updateMany({
      where: { id: transactionId, status: "pending" },
      data: {
        status: "rejected",
        confirmedByActorSource: actor.source,
        confirmedByActorId: actor.id,
        ...(reason
          ? {
              referenceNote: [transaction.referenceNote, `Rejected: ${reason}`]
                .filter(Boolean)
                .join(" — "),
            }
          : {}),
      },
    });
    if (rejected.count === 0) return { success: false, error: "Transaction already processed" };
    createNotification({
      recipientType: "builder",
      recipientId: transaction.wallet.builderId,
      type: "ad_wallet_transaction_reviewed",
      title: "Wallet top-up rejected",
      message: `Your top-up of Rs. ${Number(transaction.amount).toLocaleString()} was rejected${reason ? `: ${reason}` : "."}`,
      link: "/advertising/wallet",
    }).catch(() => {});
    return { success: true };
  }

  // Claim the pending row first, inside the transaction, so a double-click or two admins at
  // once can't both pass the pending check above and credit the wallet twice.
  const wallet = await prisma.$transaction(async (tx) => {
    const claimed = await tx.adWalletTransaction.updateMany({
      where: { id: transactionId, status: "pending" },
      data: {
        status: "confirmed",
        confirmedByActorSource: actor.source,
        confirmedByActorId: actor.id,
      },
    });
    if (claimed.count === 0) return null;
    const updatedWallet = await tx.adWallet.update({
      where: { id: transaction.walletId },
      data: { balance: { increment: transaction.amount } },
    });
    await tx.adWalletTransaction.update({
      where: { id: transactionId },
      data: { balanceAfter: updatedWallet.balance },
    });
    return updatedWallet;
  });
  if (!wallet) return { success: false, error: "Transaction already processed" };

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

  const items = await Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      type: r.type,
      amount: Number(r.amount),
      balanceAfter: r.balanceAfter != null ? Number(r.balanceAfter) : null,
      referenceNote: r.referenceNote,
      transactionId: payerTransactionId(r),
      hasProof: r.type === "topup_bank_transfer" ? await hasWalletProof(r.id) : false,
      status: r.status,
      confirmedByActorSource: r.confirmedByActorSource,
      confirmedByActorId: r.confirmedByActorId,
      createdAt: r.createdAt.toISOString(),
    }))
  );

  return { items, total, page, pageSize };
}

/** Proof file for one of this builder's own top-ups (null if not theirs or no file). */
export async function getBuilderTopUpProof(builderId: number, transactionId: number) {
  if (!isDatabaseEnabled()) return null;
  const row = await prisma.adWalletTransaction.findFirst({
    where: { id: transactionId, wallet: { builderId } },
    select: { id: true },
  });
  return row ? readWalletProof(row.id) : null;
}
