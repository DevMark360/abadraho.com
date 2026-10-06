import { mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { resolveProjectImageUrls } from "@/lib/project-media";
import { getSiteUrl } from "@/lib/app-url";
import { tableExists } from "@/lib/db-table-exists";

/**
 * Built-in packages, used only until the ad_whatsapp_plans table exists (see
 * prisma/manual-migrations/2026-10-07-whatsapp-package-plans.sql, which seeds the same three).
 * Matches the PRD's "N generated/shareable ad cards" choice (not real automated WhatsApp
 * sending, see docs/ADVERTISING_PORTAL_PRD.md §15).
 */
export const AD_WHATSAPP_PACKAGES = [
  { cards: 25, price: 2500 },
  { cards: 50, price: 4500 },
  { cards: 100, price: 8000 },
] as const;

/** A package builders can buy. id is null for the built-in fallback packages. */
export type AdWhatsappPlan = {
  id: number | null;
  name: string | null;
  cards: number;
  price: number;
  isActive: boolean;
  sortOrder: number;
};

const PLAN_LIMITS = { maxCards: 100_000, maxPrice: 100_000_000, nameLength: 100 };

async function plansTableReady(): Promise<boolean> {
  return isDatabaseEnabled() && (await tableExists("ad_whatsapp_plans"));
}

function fallbackPlans(): AdWhatsappPlan[] {
  return AD_WHATSAPP_PACKAGES.map((p, i) => ({
    id: null,
    name: null,
    cards: p.cards,
    price: p.price,
    isActive: true,
    sortOrder: i + 1,
  }));
}

/** Catalog from the database (admin-managed), or the built-in packages before the migration. */
export async function listWhatsappPlans(opts: { activeOnly?: boolean } = {}): Promise<{
  plans: AdWhatsappPlan[];
  managed: boolean;
}> {
  if (!(await plansTableReady())) {
    return { plans: fallbackPlans(), managed: false };
  }
  const rows = await prisma.adWhatsappPlan.findMany({
    where: opts.activeOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { cards: "asc" }],
  });
  return {
    managed: true,
    plans: rows.map((r) => ({
      id: r.id,
      name: r.name,
      cards: r.cards,
      price: Number(r.price),
      isActive: r.isActive,
      sortOrder: r.sortOrder,
    })),
  };
}

export type WhatsappPlanInput = {
  name?: unknown;
  cards?: unknown;
  price?: unknown;
  isActive?: unknown;
  sortOrder?: unknown;
};

function parsePlanInput(
  input: WhatsappPlanInput,
  partial: boolean
): { ok: true; data: Partial<Omit<AdWhatsappPlan, "id">> } | { ok: false; error: string } {
  const data: Partial<Omit<AdWhatsappPlan, "id">> = {};
  if (input.name !== undefined) {
    const name = String(input.name ?? "").trim();
    if (name.length > PLAN_LIMITS.nameLength) return { ok: false, error: "Name is too long (max 100)" };
    data.name = name || null;
  }
  if (input.cards !== undefined || !partial) {
    const cards = Number(input.cards);
    if (!Number.isInteger(cards) || cards < 1 || cards > PLAN_LIMITS.maxCards) {
      return { ok: false, error: "Cards must be a whole number from 1 to 100,000" };
    }
    data.cards = cards;
  }
  if (input.price !== undefined || !partial) {
    const price = Number(input.price);
    if (!Number.isFinite(price) || price <= 0 || price > PLAN_LIMITS.maxPrice) {
      return { ok: false, error: "Price must be more than 0" };
    }
    data.price = Math.round(price * 100) / 100;
  }
  if (input.isActive !== undefined) data.isActive = Boolean(input.isActive);
  if (input.sortOrder !== undefined) {
    const sortOrder = Number(input.sortOrder);
    if (!Number.isInteger(sortOrder)) return { ok: false, error: "Order must be a whole number" };
    data.sortOrder = sortOrder;
  }
  return { ok: true, data };
}

const PLANS_NOT_READY =
  "Package editing needs the ad_whatsapp_plans table. Run prisma/manual-migrations/2026-10-07-whatsapp-package-plans.sql, then restart the app.";

export async function createWhatsappPlan(input: WhatsappPlanInput) {
  if (!(await plansTableReady())) return { success: false as const, error: PLANS_NOT_READY };
  const parsed = parsePlanInput(input, false);
  if (!parsed.ok) return { success: false as const, error: parsed.error };
  const plan = await prisma.adWhatsappPlan.create({
    data: {
      name: parsed.data.name ?? null,
      cards: parsed.data.cards!,
      price: parsed.data.price!,
      isActive: parsed.data.isActive ?? true,
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });
  return { success: true as const, id: plan.id };
}

export async function updateWhatsappPlan(id: number, input: WhatsappPlanInput) {
  if (!(await plansTableReady())) return { success: false as const, error: PLANS_NOT_READY };
  const parsed = parsePlanInput(input, true);
  if (!parsed.ok) return { success: false as const, error: parsed.error };
  const existing = await prisma.adWhatsappPlan.findUnique({ where: { id } });
  if (!existing) return { success: false as const, error: "Package not found" };
  await prisma.adWhatsappPlan.update({ where: { id }, data: parsed.data });
  return { success: true as const };
}

/** Safe to delete: past purchases keep their own cards/price and are not linked to plans. */
export async function deleteWhatsappPlan(id: number) {
  if (!(await plansTableReady())) return { success: false as const, error: PLANS_NOT_READY };
  const deleted = await prisma.adWhatsappPlan.deleteMany({ where: { id } });
  return deleted.count
    ? { success: true as const }
    : { success: false as const, error: "Package not found" };
}

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
  input: { projectId: number; planId?: number; cards?: number }
): Promise<{ success: boolean; package?: AdWhatsappPackageRow; error?: string }> {
  if (!isDatabaseEnabled()) return { success: false, error: "Database disabled" };

  // Priced server-side from the active catalog; never trust a client-supplied price.
  // planId is preferred; cards is accepted for pages opened before the catalog change.
  const { plans } = await listWhatsappPlans({ activeOnly: true });
  const catalogEntry =
    (input.planId ? plans.find((p) => p.id === input.planId) : undefined) ??
    (input.cards ? plans.find((p) => p.cards === input.cards) : undefined);
  if (!catalogEntry) return { success: false, error: "This package is no longer available" };

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
