import {
  resolveProjectImageUrls,
  parsePipePaths,
  v2ProjectAssetUrl,
  projectDocumentPublicRel,
} from "@/lib/project-media";

export function adminProjectImageUrl(path: string | null | undefined): string | null {
  return v2ProjectAssetUrl(path);
}

export function adminProjectDocUrl(projectId: number, entry: string): string {
  const e = entry.trim();
  if (e.startsWith("http")) return e;
  const rel = e.includes("/") ? e : `project_${projectId}/${e}`;
  return `/${projectDocumentPublicRel(projectId, rel)}`;
}

export function listProjectImageUrls(
  cover: string | null | undefined,
  imgs: string | null | undefined
): string[] {
  return resolveProjectImageUrls(cover, imgs);
}

export function listProjectDocUrls(
  projectId: number,
  projectDoc: string | null | undefined
): { label: string; url: string }[] {
  return parsePipePaths(projectDoc).map((entry) => {
    const name = decodeURIComponent(entry.split("/").pop() ?? entry);
    return {
      label: name.replace(/^\d+_/, "").replace(/_/g, " "),
      url: adminProjectDocUrl(projectId, entry),
    };
  });
}
