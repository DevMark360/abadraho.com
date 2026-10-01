import { readFile } from "fs/promises";
import { isDatabaseEnabled } from "@/lib/db";
import { findMatchingDocEntry } from "@/lib/project-media";
import { localProjectDocumentPath } from "@/lib/project-media.server";
import { prisma } from "@/lib/prisma";

/** PDF bytes from v2 public/uploads only */
export async function fetchProjectPdf(
  projectId: number,
  filename: string
): Promise<{ bytes: Buffer; filename: string } | null> {
  if (!isDatabaseEnabled()) return null;

  const project = await prisma.project.findFirst({
    where: { id: projectId, isArchive: false },
    select: { projectDoc: true },
  });
  if (!project?.projectDoc) return null;

  const docPath = findMatchingDocEntry(projectId, project.projectDoc, filename);
  if (!docPath) return null;

  try {
    const buf = await readFile(localProjectDocumentPath(projectId, docPath));
    if (buf.length >= 4 && buf.subarray(0, 4).toString() === "%PDF") {
      return { bytes: buf, filename: decodeURIComponent(filename) };
    }
  } catch {
    return null;
  }
  return null;
}
