/**
 * Copy project media from legacy site into v2 public/uploads.
 * Reads paths from DB; downloads missing files from NEXT_PUBLIC_LEGACY_SITE_URL.
 *
 * Usage: node scripts/sync-legacy-media.mjs
 *        node scripts/sync-legacy-media.mjs --dry-run
 */
import { mkdir, writeFile, access } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
const dryRun = process.argv.includes("--dry-run");

const LEGACY_BASE = (
  process.env.NEXT_PUBLIC_LEGACY_SITE_URL ??
  process.env.LEGACY_API_URL?.replace(/\/api\/?$/, "") ??
  "https://dev.abadraho.com"
).replace(/\/$/, "");

const prisma = new PrismaClient();

function parsePipe(raw) {
  if (!raw?.trim()) return [];
  return raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** DB path → public relative path (uploads/...) */
function toPublicRel(dbPath) {
  const p = dbPath.trim().replace(/^\/+/, "");
  if (p.startsWith("uploads/")) return p;
  if (p.includes("/uploads/")) {
    const i = p.indexOf("/uploads/");
    return p.slice(i + 1);
  }
  if (p.startsWith("project_")) return `uploads/project_documents/${p}`;
  return `uploads/project_images/${p}`;
}

function legacyUrl(publicRel) {
  return `${LEGACY_BASE}/${publicRel.replace(/^\//, "")}`;
}

async function fileExists(abs) {
  try {
    await access(abs);
    return true;
  } catch {
    return false;
  }
}

async function downloadTo(publicRel) {
  const rel = publicRel.replace(/^\//, "");
  const dest = path.join(publicDir, rel);
  if (await fileExists(dest)) return { rel, status: "skip" };

  const url = legacyUrl(rel);
  if (dryRun) return { rel, status: "would-download", url };

  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) return { rel, status: "missing", url, code: res.status };

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 16) return { rel, status: "empty", url };

  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, buf);
  return { rel, status: "ok", bytes: buf.length };
}

async function collectPaths() {
  const set = new Set();

  const projects = await prisma.project.findMany({
    where: { isArchive: false },
    select: {
      id: true,
      projectCoverImg: true,
      projectImgs: true,
      projectDoc: true,
    },
  });

  for (const p of projects) {
    if (p.projectCoverImg) set.add(toPublicRel(p.projectCoverImg));
    for (const img of parsePipe(p.projectImgs)) set.add(toPublicRel(img));
    for (const doc of parsePipe(p.projectDoc)) set.add(toPublicRel(doc));
  }

  const units = await prisma.unit.findMany({
    where: { isArchive: false },
    select: { projectId: true, id: true, floorPlanImg: true, paymentPlanImg: true },
  });

  for (const u of units) {
    if (u.floorPlanImg) {
      set.add(
        `uploads/project_images/project_${u.projectId}/unit_${u.id}/${u.floorPlanImg.replace(/^\//, "")}`
      );
    }
    if (u.paymentPlanImg) {
      set.add(
        `uploads/project_images/project_${u.projectId}/unit_${u.id}/${u.paymentPlanImg.replace(/^\//, "")}`
      );
    }
  }

  return [...set].sort();
}

async function main() {
  console.log(`Legacy source: ${LEGACY_BASE}`);
  console.log(`Destination: ${publicDir}`);
  if (dryRun) console.log("(dry run — no writes)\n");

  const paths = await collectPaths();
  console.log(`Unique media paths in DB: ${paths.length}\n`);

  const stats = { ok: 0, skip: 0, missing: 0, empty: 0, wouldDownload: 0 };

  for (let i = 0; i < paths.length; i++) {
    const rel = paths[i];
    const r = await downloadTo(rel);
    if (r.status in stats) stats[r.status === "would-download" ? "wouldDownload" : r.status]++;
    else stats.ok++;

    if (["ok", "missing", "would-download"].includes(r.status)) {
      const tag = r.status === "ok" ? `+ ${(r.bytes / 1024).toFixed(1)}KB` : r.status;
      console.log(`[${i + 1}/${paths.length}] ${tag} ${rel}`);
      if (r.status === "missing") console.log(`    ${r.url} → ${r.code}`);
    }

    if ((i + 1) % 50 === 0) console.log(`--- progress ${i + 1}/${paths.length} ---`);
  }

  console.log("\nDone:", stats);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
