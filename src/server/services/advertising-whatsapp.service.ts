import { mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { resolveProjectImageUrls } from "@/lib/project-media";
import { getSiteUrl } from "@/lib/app-url";

/**
 * Flat-fee packages, priced server-side from this fixed catalog — never trust a client-supplied
 * price for a real wallet deduction. Matches the PRD's "N generated/shareable ad cards" choice
 * (not real automated WhatsApp sending, see docs/ADVERTISING_PORTAL_PRD.md §15).
 */
export const AD_WHATSAPP_PACKAGES = [
  { cards: 25, price: 2500 },
  { cards: 50, price: 4500 },
  { cards: 100, price: 8000 },
] as const;

const CARD_DIR = path.join(process.cwd(), "public", "uploads", "ad_whatsapp_cards");

function publicUrlFromPath(filePath: string): string {
  const p = filePath.trim().replace(/^\//, "");
  return p.startsWith("uploads/") ? `/${p}` : `/uploads/${p}`;
}

export type AdWhatsappPackageRow = {
  id: number;
  projectId: number;
  projectName: string;
  totalCards: number;
  usedCards: number;
  pricePaid: number;
  status: string;
  createdAt: string;
};

function toPackageRow(pkg: {
  id: number;
  projectId: number;
  project: { name: string };
  totalCards: number;
  usedCards: number;
  pricePaid: unknown;
  status: string;
  createdAt: Date;
}): AdWhatsappPackageRow {
  return {
    id: pkg.id,
    projectId: pkg.projectId,
    projectName: pkg.project.name,
    totalCards: pkg.totalCards,
    usedCards: pkg.usedCards,
    pricePaid: Number(pkg.pricePaid),
    status: pkg.status,
    createdAt: pkg.createdAt.toISOString(),
  };
}

async function builderOwnsProjectDirectly(builderId: number, projectId: number): Promise<boolean> {
  const owner = await prisma.projectOwner.findFirst({ where: { projectId, builderId } });
  return Boolean(owner);
}

export async function listAdWhatsappPackagesForBuilder(
  builderId: number
): Promise<AdWhatsappPackageRow[]> {
  if (!isDatabaseEnabled()) return [];
  const rows = await prisma.adWhatsappPackage.findMany({
    where: { builderId },
    include: { project: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toPackageRow);
}

export async function purchaseAdWhatsappPackage(
  builderId: number,
  input: { projectId: number; cards: number }
): Promise<{ success: boolean; package?: AdWhatsappPackageRow; error?: string }> {
  if (!isDatabaseEnabled()) return { success: false, error: "Database disabled" };

  const catalogEntry = AD_WHATSAPP_PACKAGES.find((p) => p.cards === input.cards);
  if (!catalogEntry) return { success: false, error: "Invalid package size" };

  const owns = await builderOwnsProjectDirectly(builderId, input.projectId);
  if (!owns) return { success: false, error: "You do not own this project" };

  const wallet = await prisma.adWallet.upsert({
    where: { builderId },
    create: { builderId },
    update: {},
  });
  if (Number(wallet.balance) < catalogEntry.price) {
    return { success: false, error: "Insufficient wallet balance for this package" };
  }

  const pkg = await prisma.$transaction(async (tx) => {
    const updatedWallet = await tx.adWallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: catalogEntry.price } },
    });
    await tx.adWalletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "whatsapp_package_purchase",
        amount: -catalogEntry.price,
        balanceAfter: updatedWallet.balance,
        status: "confirmed",
        referenceNote: `WhatsApp ad card package: ${catalogEntry.cards} cards`,
      },
    });
    return tx.adWhatsappPackage.create({
      data: {
        builderId,
        projectId: input.projectId,
        totalCards: catalogEntry.cards,
        pricePaid: catalogEntry.price,
      },
      include: { project: { select: { name: true } } },
    });
  });

  return { success: true, package: toPackageRow(pkg) };
}

export type AdWhatsappCardResult =
  | { success: true; id: number; fileUrl: string; shareUrl: string; usedCards: number; totalCards: number }
  | { success: false; error: string };

/** Generates a new shareable card image against a package's remaining credit — one row per generation, unlike the broker card pattern which reuses a single row per project. */
export async function generateAdWhatsappCard(
  builderId: number,
  packageId: number,
  siteBase?: string | null
): Promise<AdWhatsappCardResult> {
  if (!isDatabaseEnabled()) return { success: false, error: "Database disabled" };

  const pkg = await prisma.adWhatsappPackage.findFirst({
    where: { id: packageId, builderId },
    include: { project: { select: { id: true, name: true, slug: true, projectCoverImg: true, projectImgs: true } } },
  });
  if (!pkg) return { success: false, error: "Package not found" };
  if (pkg.status !== "active" || pkg.usedCards >= pkg.totalCards) {
    return { success: false, error: "This package has no remaining card credits" };
  }

  const imageUrl = resolveProjectImageUrls(pkg.project.projectCoverImg, pkg.project.projectImgs)[0] ?? null;
  if (!imageUrl) {
    return { success: false, error: "This project has no cover image to generate a card from" };
  }
  const rel = imageUrl.replace(/^\//, "");

  // Some legacy project rows store only a bare cover filename (no project_<id>/ subfolder),
  // which resolveProjectImageUrls can't disambiguate — fall back to the per-project folder
  // where the file actually lives on disk.
  let sourcePath = path.join(process.cwd(), "public", rel);
  if (!existsSync(sourcePath)) {
    const fallbackRel = `uploads/project_images/project_${pkg.project.id}/${path.basename(rel)}`;
    const fallbackPath = path.join(process.cwd(), "public", fallbackRel);
    if (existsSync(fallbackPath)) sourcePath = fallbackPath;
  }
  if (!existsSync(sourcePath)) {
    return { success: false, error: "This project's cover image file could not be found" };
  }

  const dir = path.join(CARD_DIR, String(builderId));
  await mkdir(dir, { recursive: true });
  const ext = path.extname(rel) || ".jpg";
  const filename = `package_${packageId}_${pkg.usedCards + 1}${ext}`;
  const relPath = `uploads/ad_whatsapp_cards/${builderId}/${filename}`;

  await writeFile(path.join(dir, filename), await readFile(sourcePath));

  const updated = await prisma.$transaction(async (tx) => {
    const card = await tx.adWhatsappCard.create({ data: { packageId, filePath: relPath } });
    const newUsedCards = pkg.usedCards + 1;
    await tx.adWhatsappPackage.update({
      where: { id: packageId },
      data: {
        usedCards: { increment: 1 },
        ...(newUsedCards >= pkg.totalCards ? { status: "exhausted" } : {}),
      },
    });
    return { cardId: card.id, usedCards: newUsedCards };
  });

  const base = siteBase?.trim().replace(/\/$/, "") || getSiteUrl();
  const projectUrl = `${base}/project/${pkg.project.slug}`;
  const text = encodeURIComponent(`Check out ${pkg.project.name} on Abadraho: ${projectUrl}`);

  return {
    success: true,
    id: updated.cardId,
    fileUrl: publicUrlFromPath(relPath),
    shareUrl: `https://wa.me/?text=${text}`,
    usedCards: updated.usedCards,
    totalCards: pkg.totalCards,
  };
}

export type AdWhatsappCardRow = { id: number; fileUrl: string; createdAt: string };

export async function listAdWhatsappCardsForPackage(
  builderId: number,
  packageId: number
): Promise<AdWhatsappCardRow[] | null> {
  if (!isDatabaseEnabled()) return [];
  const pkg = await prisma.adWhatsappPackage.findFirst({ where: { id: packageId, builderId } });
  if (!pkg) return null;
  const cards = await prisma.adWhatsappCard.findMany({
    where: { packageId },
    orderBy: { createdAt: "desc" },
  });
  return cards.map((c) => ({
    id: c.id,
    fileUrl: publicUrlFromPath(c.filePath),
    createdAt: c.createdAt.toISOString(),
  }));
}

/** Admin-facing read-only list across all builders (pre-paid — no approve/reject needed). */
export async function listAllAdWhatsappPackages(options?: {
  page?: number;
  pageSize?: number;
}): Promise<{ items: (AdWhatsappPackageRow & { builderName: string })[]; total: number }> {
  if (!isDatabaseEnabled()) return { items: [], total: 0 };

  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, options?.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const [rows, total] = await Promise.all([
    prisma.adWhatsappPackage.findMany({
      include: {
        project: { select: { name: true } },
        builder: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.adWhatsappPackage.count(),
  ]);

  return {
    items: rows.map((r) => ({ ...toPackageRow(r), builderName: r.builder.fullName })),
    total,
  };
}
