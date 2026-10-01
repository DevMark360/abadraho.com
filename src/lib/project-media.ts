import { normalizeUploadPublicPath } from "@/lib/upload-paths";

/**
 * Project images/docs: v2 only — paths under /uploads on this app (public/).
 * Client-safe (no fs).
 */
export function v2ProjectAssetUrl(assetPath: string | null | undefined): string | null {
  if (!assetPath || assetPath === "null") return null;
  const p = assetPath.trim();
  if (!p) return null;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  return normalizeUploadPublicPath(p.startsWith("/") ? p : p);
}

/** Pipe-separated legacy paths */
export function parsePipePaths(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function resolveProjectImageUrls(
  cover: string | null | undefined,
  imgs: string | null | undefined
): string[] {
  const urls: string[] = [];
  const coverUrl = v2ProjectAssetUrl(cover);
  if (coverUrl) urls.push(coverUrl);
  for (const p of parsePipePaths(imgs)) {
    const u = v2ProjectAssetUrl(p);
    if (u && !urls.includes(u)) urls.push(u);
  }
  return urls;
}

export interface ProjectDocument {
  filename: string;
  downloadPath: string;
  label: string;
}

/** PDF links for /download-pdf/{projectId}/{filename} */
export function resolveProjectDocuments(
  projectId: number,
  projectDoc: string | null | undefined
): ProjectDocument[] {
  const docs: ProjectDocument[] = [];
  for (const entry of parsePipePaths(projectDoc)) {
    const filename = decodeURIComponent(entry.split("/").pop() ?? entry);
    if (!filename) continue;
    const cleaned = filename
      .replace(/^\d+_/, "")
      .replace(/_/g, " ")
      .replace(/\.pdf$/i, "")
      .trim();
    docs.push({
      filename,
      downloadPath: `/download-pdf/${projectId}/${encodeURIComponent(filename)}`,
      label: cleaned && !/^\d+$/.test(cleaned) ? cleaned : "Download PDF",
    });
  }
  return docs;
}

export function projectDocumentPublicRel(projectId: number, docEntry: string): string {
  const pathPart = docEntry.includes("/")
    ? docEntry
    : `project_${projectId}/${docEntry}`;
  return `uploads/project_documents/${pathPart.replace(/^\//, "")}`;
}

export function findMatchingDocEntry(
  projectId: number,
  projectDoc: string | null | undefined,
  filename: string
): string | null {
  const decoded = decodeURIComponent(filename);
  for (const entry of parsePipePaths(projectDoc)) {
    const base = decodeURIComponent(entry.split("/").pop() ?? entry);
    if (base === decoded) {
      return entry.includes("/") ? entry : `project_${projectId}/${entry}`;
    }
  }
  return null;
}

export function youtubeEmbedUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.includes("youtube.com/embed/")) return u;
  const watch = u.match(/[?&]v=([^&]+)/);
  if (watch) return `https://www.youtube.com/embed/${watch[1]}`;
  const short = u.match(/youtu\.be\/([^?]+)/);
  if (short) return `https://www.youtube.com/embed/${short[1]}`;
  if (u.includes("youtube.com") || u.includes("youtu.be")) return u;
  return u.startsWith("http") ? u : null;
}

export { normalizeUploadPublicPath };
