import { normalizeUploadPublicPath } from "@/lib/upload-paths";

/** Local public asset path (no external host). */
export function publicAssetUrl(assetPath: string | null | undefined): string | null {
  if (!assetPath || assetPath === "null") return null;
  const p = assetPath.trim();
  if (!p) return null;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;

  const withSlash = p.startsWith("/") ? p : `/${p}`;
  if (
    withSlash.includes("/uploads") ||
    withSlash.includes("/assets") ||
    withSlash.includes("/storage")
  ) {
    return normalizeUploadPublicPath(withSlash);
  }

  return `/uploads/project_images/${p.replace(/^\//, "")}`;
}

export function publicStaticUrl(assetPath: string): string {
  const p = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
  return p.startsWith("/assets") ? p : `/assets${p}`;
}

export function publicBlogImageUrl(cover: string | null | undefined): string | null {
  if (!cover?.trim()) return null;
  if (cover.startsWith("http")) return cover;
  return `/uploads/blogs/${cover.replace(/^\//, "")}`;
}

export const DEFAULT_PROJECT_IMAGE = "/assets/images/home/northkarachi.jpg";
