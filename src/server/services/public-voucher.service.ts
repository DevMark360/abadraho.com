import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { VOUCHER_MODEL_TYPE } from "@/lib/voucher-data";
import type { SessionUser } from "@/lib/session";

export async function redeemProjectVoucher(
  projectId: number,
  session: SessionUser | null
) {
  if (!session?.id) {
    return {
      success: false as const,
      message: "Sign in to download a voucher",
      requiresAuth: true,
    };
  }
  if (!isDatabaseEnabled()) {
    return { success: false as const, message: "Database not configured" };
  }

  const now = new Date();
  const voucher = await prisma.voucher.findFirst({
    where: {
      modelType: VOUCHER_MODEL_TYPE,
      modelId: projectId,
      status: 1,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { id: "desc" },
    select: { id: true, code: true },
  });

  if (!voucher) {
    return { success: false as const, message: "No active voucher for this project" };
  }

  const existing = await prisma.userVoucher.findFirst({
    where: { userId: session.id, voucherId: voucher.id },
    select: { id: true },
  });
  if (existing) {
    return { success: true as const, code: voucher.code, alreadyRedeemed: true };
  }

  await prisma.userVoucher.create({
    data: {
      userId: session.id,
      voucherId: voucher.id,
      redeemedAt: now,
    },
  });

  return { success: true as const, code: voucher.code };
}
