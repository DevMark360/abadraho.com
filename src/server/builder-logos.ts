import fs from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { imageExtension, resolveUploadPath, validateImageFile } from "@/lib/admin-file-upload";
import { slugify } from "@/lib/slugify";

/**
 * Builder logos (map pins, map cards, builder pages) come from two places:
 * 1. Uploaded in Admin → Builders → Edit: public/uploads/builder_logos/builder_<id>.<ext>.
 *    Takes effect right away (no rebuild), like project images.
 * 2. Files shipped with the code in public/builders-logos/, named after the builder
 *    (e.g. "roomi-builders.jpg"). Need a rebuild + restart.
 * An uploaded logo wins over a shipped file.
 */
const SHIPPED_DIR = "builders-logos";
const UPLOAD_DIR = path.join("uploads", "builder_logos");
const LOGO_EXT = /\.(jpe?g|png|webp|svg|avif|gif)$/i;
const UPLOAD_FILE = /^builder_(\d+)\.(jpe?g|png|webp|gif)$/i;
export const BUILDER_LOGO_MAX_BYTES = 2 * 1024 * 1024;

/** Uploads can change while the app runs (and across worker processes): re-read this often. */
const UPLOAD_INDEX_TTL_MS = 30_000;

/** Words that vary between how a builder is typed in the DB and how the logo file is named. */
const GENERIC_WORDS = new Set([
  "builder",
  "builders",
  "developer",
  "developers",
  "and",
  "group",
  "groups",
  "of",
  "company",
  "companies",
]);

function coreKey(slug: string): string {
  return slug
    .split("-")
    .filter((w) => w && !GENERIC_WORDS.has(w))
    .join("-");
}

function publicDir(...parts: string[]) {
  return path.join(process.cwd(), "public", ...parts);
}

type ShippedIndex = { bySlug: Map<string, string>; byCore: Map<string, string | null> };
let shipped: ShippedIndex | null = null;

function shippedIndex(): ShippedIndex {
  if (shipped) return shipped;
  const bySlug = new Map<string, string>();
  const byCore = new Map<string, string | null>();
  try {
    for (const file of fs.readdirSync(publicDir(SHIPPED_DIR))) {
      if (!LOGO_EXT.test(file)) continue;
      const slug = slugify(file.replace(LOGO_EXT, ""));
      if (!slug) continue;
      const url = `/${SHIPPED_DIR}/${encodeURIComponent(file)}`;
      bySlug.set(slug, url);
      const core = coreKey(slug);
      // Two logos sharing a core name are ambiguous: only exact slugs may use them.
      if (core) byCore.set(core, byCore.has(core) ? null : url);
    }
  } catch {
    /* folder missing: no shipped logos */
  }
  shipped = { bySlug, byCore };
  return shipped;
}

let uploaded: { at: number; byId: Map<number, { file: string; url: string }> } | null = null;

function uploadedIndex() {
  if (uploaded && Date.now() - uploaded.at < UPLOAD_INDEX_TTL_MS) return uploaded.byId;
  const byId = new Map<number, { file: string; url: string }>();
  try {
    const dir = publicDir(UPLOAD_DIR);
    for (const file of fs.readdirSync(dir)) {
      const m = file.match(UPLOAD_FILE);
      if (!m) continue;
      // ?v= busts browser/CDN caches when a logo is replaced with the same file name.
      const version = Math.round(fs.statSync(path.join(dir, file)).mtimeMs);
      byId.set(Number(m[1]), { file, url: `/uploads/builder_logos/${file}?v=${version}` });
    }
  } catch {
    /* folder missing: nothing uploaded yet */
  }
  uploaded = { at: Date.now(), byId };
  return byId;
}

function shippedLogoUrl(builderName: string | null | undefined): string | null {
  const slug = builderName ? slugify(builderName) : "";
  if (!slug) return null;
  const { bySlug, byCore } = shippedIndex();
  const exact = bySlug.get(slug);
  if (exact) return exact;
  const core = coreKey(slug);
  return (core && byCore.get(core)) || null;
}

/** Public URL of the builder's logo, or null when it has none. */
export function builderLogoUrl(
  builderName: string | null | undefined,
  builderId?: number | null
): string | null {
  if (builderId) {
    const up = uploadedIndex().get(builderId);
    if (up) return up.url;
  }
  return shippedLogoUrl(builderName);
}

/** For the admin form: which logo is in use and whether it can be removed there. */
export function builderLogoInfo(builderId: number, builderName: string) {
  const up = uploadedIndex().get(builderId);
  if (up) return { url: up.url, source: "upload" as const };
  const file = shippedLogoUrl(builderName);
  return { url: file, source: file ? ("file" as const) : null };
}

async function deleteUploaded(builderId: number) {
  const dir = publicDir(UPLOAD_DIR);
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return;
  }
  for (const file of files) {
    const m = file.match(UPLOAD_FILE);
    if (m && Number(m[1]) === builderId) {
      await unlink(resolveUploadPath(dir, file)).catch(() => undefined);
    }
  }
}

export async function saveBuilderLogo(builderId: number, file: File): Promise<{ error?: string }> {
  const check = validateImageFile(file, BUILDER_LOGO_MAX_BYTES);
  if (!check.ok) {
    return { error: check.error === "Image must be under 5MB" ? "Logo must be under 2MB" : check.error };
  }
  const dir = publicDir(UPLOAD_DIR);
  await mkdir(dir, { recursive: true });
  await deleteUploaded(builderId); // the old one may have a different extension
  const fname = `builder_${builderId}${imageExtension(file)}`;
  await writeFile(resolveUploadPath(dir, fname), Buffer.from(await file.arrayBuffer()));
  uploaded = null;
  return {};
}

export async function removeBuilderLogo(builderId: number): Promise<void> {
  await deleteUploaded(builderId);
  uploaded = null;
}
