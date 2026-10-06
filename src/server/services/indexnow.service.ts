import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { absoluteUrl, getSiteUrl, isLocalSiteUrl } from "@/lib/seo";
import { getBlogPublicPath } from "@/server/services/blog.service";

/**
 * IndexNow (https://www.indexnow.org): tells Bing/Copilot, Yandex, Seznam, Naver, etc. that a
 * URL changed, so they re-crawl it right away instead of on their own schedule.
 *
 * Setup: set INDEXNOW_KEY (8-128 letters, digits, or dashes) in the server .env. The key is
 * served at /indexnow-key.txt (see src/app/indexnow-key.txt/route.ts) and sent as keyLocation.
 */
const ENDPOINT = "https://api.indexnow.org/indexnow";
export const INDEXNOW_KEY_PATH = "/indexnow-key.txt";

export function indexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY?.trim();
  return key && /^[a-zA-Z0-9-]{8,128}$/.test(key) ? key : null;
}

export async function submitToIndexNow(
  paths: string[]
): Promise<{ ok: boolean; status?: number; skipped?: string }> {
  const key = indexNowKey();
  if (!key) return { ok: false, skipped: "INDEXNOW_KEY not set" };
  const site = getSiteUrl();
  if (process.env.NODE_ENV !== "production" || isLocalSiteUrl(site)) {
    return { ok: false, skipped: "not production" };
  }
  const urlList = [...new Set(paths.filter(Boolean).map((p) => absoluteUrl(p)))].slice(0, 10_000);
  if (!urlList.length) return { ok: false, skipped: "no URLs" };

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: new URL(site).host,
        key,
        keyLocation: absoluteUrl(INDEXNOW_KEY_PATH),
        urlList,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false };
  }
}

/**
 * Queue a ping to run after the response is sent: never slows down or fails the admin
 * request that triggered it. Failures are only logged.
 */
export function notifyIndexNow(resolvePaths: () => Promise<string[]> | string[]) {
  after(async () => {
    try {
      const result = await submitToIndexNow(await resolvePaths());
      if (!result.ok && !result.skipped) {
        console.warn("[indexnow] submit failed", result.status ?? "network error");
      }
    } catch (err) {
      console.warn("[indexnow] submit failed", err);
    }
  });
}

export async function projectPublicPath(projectId: number): Promise<string | null> {
  const row = await prisma.project.findUnique({
    where: { id: projectId },
    select: { slug: true },
  });
  return row?.slug ? `/project/${row.slug}` : null;
}

/** A project was created, edited, approved, or removed: its page, the listings, and home. */
export function notifyProjectChanged(projectId: number, knownPath?: string | null) {
  notifyIndexNow(async () => {
    const path = knownPath ?? (await projectPublicPath(projectId));
    return [path ?? "", "/projects", "/"];
  });
}

/** A blog post was created, edited, or removed: its page, the blog index, and home. */
export function notifyBlogChanged(blogId: number, knownPath?: string | null) {
  notifyIndexNow(async () => {
    const path = knownPath ?? (await getBlogPublicPath(blogId));
    return [path ?? "", "/blog", "/"];
  });
}
