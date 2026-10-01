import { mkdir, writeFile } from "fs/promises";
import path from "node:path";
import { isDatabaseEnabled } from "@/lib/db";
import {
  parsePipePaths,
  projectDocumentPublicRel,
  resolveProjectImageUrls,
} from "@/lib/project-media";
import { localProjectDocumentExists } from "@/lib/project-media.server";
import { prisma } from "@/lib/prisma";
import { brokerShortLinkPath, brokerShortLinkUrl } from "@/lib/broker-short-link-url";
import { getSiteUrl } from "@/lib/app-url";
import { getBrokerToolTables } from "@/server/services/broker-portal.service";

export type BrokerMarketingResult =
  | {
      success: true;
      id: number;
      filePath?: string;
      fileUrl?: string | null;
      shortCode?: string;
      shortPath?: string;
      shortUrl?: string;
    }
  | { success: false; message: string; code?: string };

const PITCH_DIR = path.join(process.cwd(), "public", "uploads", "broker_pitch_decks");
const CARD_DIR = path.join(process.cwd(), "public", "uploads", "broker_whatsapp_cards");

function publicUrlFromPath(filePath: string): string {
  const p = filePath.trim().replace(/^\//, "");
  return p.startsWith("uploads/") ? `/${p}` : `/uploads/${p}`;
}

async function assertActiveProject(projectId: number) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, status: 1, isArchive: false },
    select: { id: true, name: true, slug: true, projectDoc: true, projectCoverImg: true, projectImgs: true },
  });
  if (!project) {
    return { ok: false as const, message: "Active project not found", code: "PROJECT_NOT_FOUND" };
  }
  return { ok: true as const, project };
}

function resolveProjectPdfRel(projectId: number, projectDoc: string | null): string | null {
  for (const entry of parsePipePaths(projectDoc)) {
    if (!entry.toLowerCase().includes(".pdf") && !entry.includes("/")) continue;
    const rel = projectDocumentPublicRel(projectId, entry);
    if (localProjectDocumentExists(projectId, entry)) return rel;
  }
  for (const entry of parsePipePaths(projectDoc)) {
    const rel = projectDocumentPublicRel(projectId, entry);
    if (localProjectDocumentExists(projectId, entry)) return rel;
  }
  return null;
}

function resolveProjectImageRel(
  cover: string | null,
  imgs: string | null
): string | null {
  const urls = resolveProjectImageUrls(cover, imgs);
  if (!urls.length) return null;
  const first = urls[0]!.replace(/^\//, "");
  return first.startsWith("uploads/") ? first : `uploads/project_images/${first.replace(/^uploads\/project_images\//, "")}`;
}

function randomShortCode(length = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function uniqueShortCode(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = randomShortCode(8);
    const exists = await prisma.brokerShortLink.findUnique({ where: { shortCode: code } });
    if (!exists) return code;
  }
  throw new Error("Could not generate unique short code");
}

export async function generateBrokerPitchDeck(
  brokerId: number,
  projectId: number
): Promise<BrokerMarketingResult> {
  if (!isDatabaseEnabled()) {
    return { success: false, message: "Database disabled", code: "DB_DISABLED" };
  }
  const tools = await getBrokerToolTables();
  if (!tools.pitchDecks) {
    return { success: false, message: "Pitch deck table not available", code: "TOOLS_UNAVAILABLE" };
  }

  const check = await assertActiveProject(projectId);
  if (!check.ok) return { success: false, message: check.message, code: check.code };

  const filePath = resolveProjectPdfRel(projectId, check.project.projectDoc);
  if (!filePath) {
    return {
      success: false,
      message: "This project has no PDF brochure. Upload a custom pitch deck instead.",
      code: "NO_PROJECT_PDF",
    };
  }

  const existing = await prisma.brokerPitchDeck.findFirst({
    where: { brokerId, projectId },
    orderBy: { id: "desc" },
  });

  const row = existing
    ? await prisma.brokerPitchDeck.update({
        where: { id: existing.id },
        data: { filePath, createdAt: new Date() },
      })
    : await prisma.brokerPitchDeck.create({
        data: { brokerId, projectId, filePath },
      });

  return {
    success: true,
    id: row.id,
    filePath: row.filePath ?? filePath,
    fileUrl: publicUrlFromPath(filePath),
  };
}

export async function uploadBrokerPitchDeck(
  brokerId: number,
  projectId: number,
  file: File
): Promise<BrokerMarketingResult> {
  if (!isDatabaseEnabled()) {
    return { success: false, message: "Database disabled", code: "DB_DISABLED" };
  }
  const tools = await getBrokerToolTables();
  if (!tools.pitchDecks) {
    return { success: false, message: "Pitch deck table not available", code: "TOOLS_UNAVAILABLE" };
  }

  const check = await assertActiveProject(projectId);
  if (!check.ok) return { success: false, message: check.message, code: check.code };

  if (!file.size) return { success: false, message: "Empty file", code: "INVALID_FILE" };
  const ext = path.extname(file.name).toLowerCase() || ".pdf";
  if (ext !== ".pdf") {
    return { success: false, message: "Pitch deck must be a PDF file", code: "INVALID_FILE" };
  }
  if (file.size > 15 * 1024 * 1024) {
    return { success: false, message: "PDF must be under 15MB", code: "INVALID_FILE" };
  }

  const dir = path.join(PITCH_DIR, String(brokerId));
  await mkdir(dir, { recursive: true });
  const filename = `project_${projectId}_${Date.now()}.pdf`;
  const relPath = `uploads/broker_pitch_decks/${brokerId}/${filename}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  const existing = await prisma.brokerPitchDeck.findFirst({
    where: { brokerId, projectId },
    orderBy: { id: "desc" },
  });

  const row = existing
    ? await prisma.brokerPitchDeck.update({
        where: { id: existing.id },
        data: { filePath: relPath, createdAt: new Date() },
      })
    : await prisma.brokerPitchDeck.create({
        data: { brokerId, projectId, filePath: relPath },
      });

  return {
    success: true,
    id: row.id,
    filePath: relPath,
    fileUrl: publicUrlFromPath(relPath),
  };
}

export async function generateBrokerWhatsappCard(
  brokerId: number,
  projectId: number
): Promise<BrokerMarketingResult> {
  if (!isDatabaseEnabled()) {
    return { success: false, message: "Database disabled", code: "DB_DISABLED" };
  }
  const tools = await getBrokerToolTables();
  if (!tools.whatsappCards) {
    return { success: false, message: "WhatsApp card table not available", code: "TOOLS_UNAVAILABLE" };
  }

  const check = await assertActiveProject(projectId);
  if (!check.ok) return { success: false, message: check.message, code: check.code };

  const filePath = resolveProjectImageRel(check.project.projectCoverImg, check.project.projectImgs);
  if (!filePath) {
    return {
      success: false,
      message: "This project has no cover image. Upload a custom WhatsApp card instead.",
      code: "NO_PROJECT_IMAGE",
    };
  }

  const existing = await prisma.brokerWhatsAppCard.findFirst({
    where: { brokerId, projectId },
    orderBy: { id: "desc" },
  });

  const row = existing
    ? await prisma.brokerWhatsAppCard.update({
        where: { id: existing.id },
        data: { filePath, createdAt: new Date() },
      })
    : await prisma.brokerWhatsAppCard.create({
        data: { brokerId, projectId, filePath },
      });

  return {
    success: true,
    id: row.id,
    filePath,
    fileUrl: publicUrlFromPath(filePath),
  };
}

export async function uploadBrokerWhatsappCard(
  brokerId: number,
  projectId: number,
  file: File
): Promise<BrokerMarketingResult> {
  if (!isDatabaseEnabled()) {
    return { success: false, message: "Database disabled", code: "DB_DISABLED" };
  }
  const tools = await getBrokerToolTables();
  if (!tools.whatsappCards) {
    return { success: false, message: "WhatsApp card table not available", code: "TOOLS_UNAVAILABLE" };
  }

  const check = await assertActiveProject(projectId);
  if (!check.ok) return { success: false, message: check.message, code: check.code };

  if (!file.size) return { success: false, message: "Empty file", code: "INVALID_FILE" };
  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    return {
      success: false,
      message: "WhatsApp card must be JPG, PNG, or WebP",
      code: "INVALID_FILE",
    };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, message: "Image must be under 5MB", code: "INVALID_FILE" };
  }

  const dir = path.join(CARD_DIR, String(brokerId));
  await mkdir(dir, { recursive: true });
  const filename = `project_${projectId}_${Date.now()}${ext}`;
  const relPath = `uploads/broker_whatsapp_cards/${brokerId}/${filename}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  const existing = await prisma.brokerWhatsAppCard.findFirst({
    where: { brokerId, projectId },
    orderBy: { id: "desc" },
  });

  const row = existing
    ? await prisma.brokerWhatsAppCard.update({
        where: { id: existing.id },
        data: { filePath: relPath, createdAt: new Date() },
      })
    : await prisma.brokerWhatsAppCard.create({
        data: { brokerId, projectId, filePath: relPath },
      });

  return {
    success: true,
    id: row.id,
    filePath: relPath,
    fileUrl: publicUrlFromPath(relPath),
  };
}

export async function createBrokerShortLink(
  brokerId: number,
  projectId: number,
  origin?: string | null
): Promise<BrokerMarketingResult> {
  if (!isDatabaseEnabled()) {
    return { success: false, message: "Database disabled", code: "DB_DISABLED" };
  }
  const tools = await getBrokerToolTables();
  if (!tools.shortLinks) {
    return { success: false, message: "Short link table not available", code: "TOOLS_UNAVAILABLE" };
  }

  const check = await assertActiveProject(projectId);
  if (!check.ok) return { success: false, message: check.message, code: check.code };

  const existing = await prisma.brokerShortLink.findFirst({
    where: { brokerId, projectId },
    orderBy: { id: "desc" },
  });

  if (existing) {
    const shortPath = brokerShortLinkPath(check.project.slug, existing.shortCode);
    return {
      success: true,
      id: existing.id,
      shortCode: existing.shortCode,
      shortPath,
      shortUrl: brokerShortLinkUrl(check.project.slug, existing.shortCode, origin),
    };
  }

  const shortCode = await uniqueShortCode();
  const row = await prisma.brokerShortLink.create({
    data: { brokerId, projectId, shortCode },
  });

  const shortPath = brokerShortLinkPath(check.project.slug, row.shortCode);
  return {
    success: true,
    id: row.id,
    shortCode: row.shortCode,
    shortPath,
    shortUrl: brokerShortLinkUrl(check.project.slug, row.shortCode, origin),
  };
}

export async function shareBrokerWhatsappCard(
  brokerId: number,
  cardId: number,
  siteBase?: string | null
): Promise<{ success: true; shareUrl: string } | { success: false; message: string }> {
  if (!isDatabaseEnabled()) {
    return { success: false, message: "Database disabled" };
  }

  const card = await prisma.brokerWhatsAppCard.findFirst({
    where: { id: cardId, brokerId },
  });
  if (!card) return { success: false, message: "WhatsApp card not found" };

  const project = await prisma.project.findFirst({
    where: { id: card.projectId },
    select: { name: true, slug: true },
  });
  if (!project) return { success: false, message: "Project not found" };

  const base = (siteBase?.trim().replace(/\/$/, "") || getSiteUrl());
  const projectUrl = `${base}/project/${project.slug}`;
  const text = encodeURIComponent(`Check out ${project.name} on Abadraho: ${projectUrl}`);
  return { success: true, shareUrl: `https://wa.me/?text=${text}` };
}
