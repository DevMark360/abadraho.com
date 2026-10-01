import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { getSiteUrl } from "@/lib/app-url";
import { createNotification } from "@/server/services/notification.service";

/**
 * JazzCash Hosted Checkout / Payment Portal v2.0 (sandbox/test mode).
 *
 * Credentials are merchant-specific and only issued after self-registering at
 * https://sandbox.jazzcash.com.pk/Sandbox/ — there is no universal public sandbox
 * Merchant ID/Password/Integrity Salt to hardcode. Until JAZZCASH_MERCHANT_ID etc. are set,
 * `isJazzCashConfigured()` returns false and initiateJazzCashTopup rejects with a clear error
 * rather than building a payload that would silently fail against JazzCash's servers.
 *
 * Hash algorithm (pp_SecureHash) verified against the official "Payment Gateway Integration
 * Guide for Merchants v4.2" and cross-checked against a reference implementation + a hand-run
 * worked example from the guide — see docs/ADVERTISING_PORTAL_DEPLOYMENT.md Milestone 12:
 *   1. Take every non-empty pp_/ppmpf_/ppmbf_ field (pp_SecureHash itself excluded).
 *   2. Sort field NAMES alphabetically; concatenate the corresponding VALUES with "&".
 *   3. Prepend the Integrity Salt followed by "&".
 *   4. HMAC-SHA256 (key = Integrity Salt), hex-encoded.
 */

function jazzCashConfig() {
  return {
    merchantId: process.env.JAZZCASH_MERCHANT_ID ?? "",
    password: process.env.JAZZCASH_PASSWORD ?? "",
    integritySalt: process.env.JAZZCASH_INTEGRITY_SALT ?? "",
    sandboxUrl:
      process.env.JAZZCASH_SANDBOX_URL ??
      "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform",
  };
}

export function isJazzCashConfigured(): boolean {
  const c = jazzCashConfig();
  return Boolean(c.merchantId && c.password && c.integritySalt);
}

/** Builds pp_SecureHash per the algorithm documented above. Excludes pp_SecureHash from its own input. */
export function buildSecureHash(fields: Record<string, string>, integritySalt: string): string {
  const relevantKeys = Object.keys(fields)
    .filter((k) => k !== "pp_SecureHash")
    .filter((k) => k.startsWith("pp_") || k.startsWith("ppmpf_") || k.startsWith("ppmbf_"))
    .filter((k) => fields[k] != null && fields[k] !== "")
    .sort();

  const message = [integritySalt, ...relevantKeys.map((k) => fields[k])].join("&");
  return createHmac("sha256", integritySalt).update(message).digest("hex");
}

function formatJazzCashDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

function generateTxnRefNo(builderId: number, now: Date): string {
  // Max 20 chars, alphanumeric (& . / also allowed but unnecessary here).
  return `T${formatJazzCashDateTime(now)}${builderId}`.slice(0, 20);
}

export type JazzCashInitiateResult =
  | { success: true; actionUrl: string; fields: Record<string, string> }
  | { success: false; error: string };

export async function initiateJazzCashTopup(
  builderId: number,
  amount: number,
  siteUrl?: string,
  now: Date = new Date()
): Promise<JazzCashInitiateResult> {
  if (!isDatabaseEnabled()) return { success: false, error: "Database disabled" };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { success: false, error: "Amount must be greater than zero" };
  }
  const config = jazzCashConfig();
  if (!isJazzCashConfigured()) {
    return {
      success: false,
      error:
        "Online payment is not set up yet — JazzCash sandbox credentials haven't been configured. Use bank transfer instead.",
    };
  }

  const wallet = await prisma.adWallet.upsert({
    where: { builderId },
    create: { builderId },
    update: {},
  });

  const txnRefNo = generateTxnRefNo(builderId, now);
  const expiry = new Date(now.getTime() + 60 * 60 * 1000);

  await prisma.adWalletTransaction.create({
    data: {
      walletId: wallet.id,
      type: "topup_jazzcash",
      amount,
      status: "pending",
      referenceNote: "JazzCash online top-up (awaiting gateway confirmation)",
      gatewayReference: txnRefNo,
    },
  });

  const resolvedSiteUrl = (siteUrl ?? getSiteUrl()).replace(/\/$/, "");
  const fields: Record<string, string> = {
    pp_Version: "2.0",
    pp_TxnType: "MWALLET",
    pp_Language: "EN",
    pp_MerchantID: config.merchantId,
    pp_Password: config.password,
    pp_TxnRefNo: txnRefNo,
    pp_Amount: String(Math.round(amount * 100)),
    pp_TxnCurrency: "PKR",
    pp_TxnDateTime: formatJazzCashDateTime(now),
    pp_BillReference: `WALLET-${builderId}`,
    pp_Description: "Ad wallet top-up",
    pp_TxnExpiryDateTime: formatJazzCashDateTime(expiry),
    pp_ReturnURL: `${resolvedSiteUrl}/api/v1/advertising/wallet/jazzcash/callback`,
    ppmpf_1: String(builderId),
  };
  fields.pp_SecureHash = buildSecureHash(fields, config.integritySalt);

  return { success: true, actionUrl: config.sandboxUrl, fields };
}

export type JazzCashCallbackResult =
  | { success: true; status: "confirmed" | "rejected"; builderId: number }
  | { success: false; error: string };

/** Verifies pp_SecureHash before trusting any field in the callback — an unverified hash means anyone could forge a "successful" top-up. */
export async function handleJazzCashCallback(
  fields: Record<string, string>
): Promise<JazzCashCallbackResult> {
  if (!isDatabaseEnabled()) return { success: false, error: "Database disabled" };
  const config = jazzCashConfig();
  if (!isJazzCashConfigured()) {
    return { success: false, error: "JazzCash is not configured" };
  }

  const receivedHash = fields.pp_SecureHash;
  if (!receivedHash) return { success: false, error: "Missing pp_SecureHash" };

  const expectedHash = Buffer.from(buildSecureHash(fields, config.integritySalt).toLowerCase());
  const givenHash = Buffer.from(receivedHash.trim().toLowerCase());
  if (expectedHash.length !== givenHash.length || !timingSafeEqual(expectedHash, givenHash)) {
    return { success: false, error: "Hash verification failed — possible tampering" };
  }

  const txnRefNo = fields.pp_TxnRefNo;
  if (!txnRefNo) return { success: false, error: "Missing pp_TxnRefNo" };

  const transaction = await prisma.adWalletTransaction.findFirst({
    where: { gatewayReference: txnRefNo, type: "topup_jazzcash" },
    include: { wallet: { select: { id: true, builderId: true } } },
  });
  if (!transaction) return { success: false, error: "Transaction not found" };
  if (transaction.status !== "pending") {
    // Already processed (e.g. a duplicate/retried callback) — treat as success without double-crediting.
    return { success: true, status: transaction.status as "confirmed" | "rejected", builderId: transaction.wallet.builderId };
  }

  const isSuccess = fields.pp_ResponseCode === "000";

  if (!isSuccess) {
    await prisma.adWalletTransaction.updateMany({
      where: { id: transaction.id, status: "pending" },
      data: {
        status: "rejected",
        referenceNote: `JazzCash: ${fields.pp_ResponseMessage ?? fields.pp_ResponseCode ?? "declined"}`,
      },
    });
    return { success: true, status: "rejected", builderId: transaction.wallet.builderId };
  }

  // Claim the pending row inside the transaction (conditional update) before crediting, so
  // two simultaneous callbacks (browser redirect + retry) can't both pass the pending check
  // above and credit the wallet twice — the loser's updateMany matches 0 rows.
  const updatedWallet = await prisma.$transaction(async (tx) => {
    const claimed = await tx.adWalletTransaction.updateMany({
      where: { id: transaction.id, status: "pending" },
      data: { status: "confirmed" },
    });
    if (claimed.count === 0) return null;
    const wallet = await tx.adWallet.update({
      where: { id: transaction.walletId },
      data: { balance: { increment: transaction.amount } },
    });
    await tx.adWalletTransaction.update({
      where: { id: transaction.id },
      data: {
        balanceAfter: wallet.balance,
        referenceNote: `JazzCash: confirmed (${fields.pp_RetreivalReferenceNo ?? txnRefNo})`,
      },
    });
    return wallet;
  });
  if (!updatedWallet) {
    return { success: true, status: "confirmed", builderId: transaction.wallet.builderId };
  }

  createNotification({
    recipientType: "builder",
    recipientId: transaction.wallet.builderId,
    type: "ad_wallet_transaction_reviewed",
    title: "Wallet top-up confirmed",
    message: `Your online top-up of Rs. ${Number(transaction.amount).toLocaleString()} was confirmed. New balance: Rs. ${Number(updatedWallet.balance).toLocaleString()}.`,
    link: "/advertising/wallet",
  }).catch(() => {});

  return { success: true, status: "confirmed", builderId: transaction.wallet.builderId };
}
