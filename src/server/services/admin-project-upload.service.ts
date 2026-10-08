import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { parsePipePaths } from "@/lib/project-media";
import {
  ADMIN_MAX_GALLERY_FILES,
  ADMIN_MAX_PROJECT_PDF_FILES,
  imageExtension,
  resolveUploadPath,
  sanitizeUploadFilename,
  validateImageFile,
  validatePdfFile,
} from "@/lib/admin-file-upload";

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

async function writeUploadedFile(dir: string, fname: string, file: File): Promise<void> {
  const target = resolveUploadPath(dir, fname);
  await pipeline(
    Readable.fromWeb(file.stream() as import("node:stream/web").ReadableStream),
    createWriteStream(target)
  );
}

export async function uploadProjectMedia(
  projectId: number,
  files: {
    cover?: File | null;
    images?: File[];
    docs?: File[];
  }
): Promise<{ error?: string }> {
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return { error: "Project not found" };

    const imageDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "project_images",
      `project_${projectId}`
    );
    const docDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "project_documents",
      `project_${projectId}`
    );

    let coverPath = project.projectCoverImg;
    const galleryPaths = [...parsePipePaths(project.projectImgs)];
    const docPaths = [...parsePipePaths(project.projectDoc)];

    if (files.cover && files.cover.size > 0) {
      const validation = validateImageFile(files.cover);
      if (!validation.ok) return { error: validation.error };
      await ensureDir(imageDir);
      const fname = `cover_${Date.now()}${imageExtension(files.cover)}`;
      await writeUploadedFile(imageDir, fname, files.cover);
      coverPath = `uploads/project_images/project_${projectId}/${fname}`;
    }

    if (files.images?.length) {
      const batch = files.images.filter((f) => f.size > 0).slice(0, ADMIN_MAX_GALLERY_FILES);
      if (batch.length) {
        await ensureDir(imageDir);
        for (const file of batch) {
          const validation = validateImageFile(file);
          if (!validation.ok) return { error: validation.error };
          const fname = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${imageExtension(file)}`;
          await writeUploadedFile(imageDir, fname, file);
          galleryPaths.push(`uploads/project_images/project_${projectId}/${fname}`);
        }
      }
    }

    if (files.docs?.length) {
      const remaining = Math.max(0, ADMIN_MAX_PROJECT_PDF_FILES - docPaths.length);
      if (!remaining) return { error: "Maximum 10 PDF documents per project" };
      const batch = files.docs.filter((f) => f.size > 0).slice(0, remaining);
      if (batch.length) {
        await ensureDir(docDir);
        for (const file of batch) {
          const validation = validatePdfFile(file);
          if (!validation.ok) return { error: validation.error };
          const fname = sanitizeUploadFilename(file.name, "doc");
          await writeUploadedFile(docDir, fname, file);
          docPaths.push(`project_${projectId}/${fname}`);
        }
      }
    }

    await prisma.project.update({
      where: { id: projectId },
      data: {
        projectCoverImg: coverPath,
        projectImgs: galleryPaths.length ? galleryPaths.join("|") : project.projectImgs,
        projectDoc: docPaths.length ? docPaths.join("|") : project.projectDoc,
      },
    });

    return {};
  } catch (e) {
    return { error: String(e) };
  }
}

/**
 * Detach documents from a project (removes them from projects.project_doc).
 * The PDF files stay in public/uploads so a removal can be undone by re-adding the path.
 */
export async function removeProjectDocs(
  projectId: number,
  entries: string[]
): Promise<{ error?: string; remaining?: number }> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { projectDoc: true },
    });
    if (!project) return { error: "Project not found" };

    const drop = new Set(entries.map((e) => e.trim()).filter(Boolean));
    const kept = parsePipePaths(project.projectDoc).filter((p) => !drop.has(p));

    await prisma.project.update({
      where: { id: projectId },
      data: { projectDoc: kept.length ? kept.join("|") : null },
    });
    return { remaining: kept.length };
  } catch (e) {
    return { error: String(e) };
  }
}
