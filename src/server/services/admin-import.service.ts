import { mkdir, writeFile } from "fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { parseCsv } from "@/lib/csv-parse";
import { slugify } from "@/lib/slugify";
import {
  ADMIN_CSV_MAX_ROWS,
  readValidatedCsvText,
  resolveUploadPath,
  sanitizeUploadFilename,
} from "@/lib/admin-file-upload";

const IMPORT_DIR = path.join(process.cwd(), "public", "uploads", "project_imports");

async function saveImportFile(file: File, prefix: string) {
  const csv = await readValidatedCsvText(file);
  if (!csv.ok) return { error: csv.error as string };

  await mkdir(IMPORT_DIR, { recursive: true });
  const name = sanitizeUploadFilename(file.name, prefix);
  await writeFile(resolveUploadPath(IMPORT_DIR, name), csv.text, "utf8");
  return { name, text: csv.text };
}

function capImportRows<T>(rows: T[]): T[] | { error: string } {
  if (rows.length > ADMIN_CSV_MAX_ROWS) {
    return { error: `CSV exceeds ${ADMIN_CSV_MAX_ROWS.toLocaleString()} row limit` };
  }
  return rows;
}

function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k]?.trim()) return row[k].trim();
    const lower = Object.keys(row).find((x) => x.toLowerCase() === k.toLowerCase());
    if (lower && row[lower]?.trim()) return row[lower].trim();
  }
  return "";
}

/** Resolves a city name to its id, creating the city if it doesn't exist yet. Defaults to Karachi when no city column/value is given, matching every area created before city was tracked. */
async function resolveCityId(cityName: string, cache: Map<string, number>): Promise<number> {
  const slug = slugify(cityName || "Karachi") || "karachi";
  const cached = cache.get(slug);
  if (cached != null) return cached;

  const existing = await prisma.city.findUnique({ where: { slug } });
  if (existing) {
    cache.set(slug, existing.id);
    return existing.id;
  }

  const created = await prisma.city.create({ data: { name: cityName || "Karachi", slug } });
  cache.set(slug, created.id);
  return created.id;
}

export async function importAreasCsv(file: File) {
  if (!isDatabaseEnabled()) return { success: false, message: "Database disabled" };
  const saved = await saveImportFile(file, "areas");
  if ("error" in saved) return { success: false, message: saved.error };
  const { name, text } = saved;
  const parsed = capImportRows(parseCsv(text));
  if ("error" in parsed) return { success: false, message: parsed.error };
  const rows = parsed;
  let created = 0;
  let skipped = 0;
  const cityIdCache = new Map<string, number>();

  for (const row of rows) {
    const areaName = pick(row, "name", "area", "area_name");
    if (!areaName) {
      skipped++;
      continue;
    }
    const existing = await prisma.area.findFirst({ where: { name: areaName } });
    if (existing) {
      skipped++;
      continue;
    }
    const cityName = pick(row, "city", "city_name");
    const cityId = await resolveCityId(cityName, cityIdCache);
    await prisma.area.create({ data: { name: areaName, cityId } });
    created++;
  }

  return {
    success: true,
    message: `Areas import: ${created} created, ${skipped} skipped. File: ${name}`,
    created,
    skipped,
    file: name,
  };
}

export async function importProjectTypesCsv(file: File) {
  if (!isDatabaseEnabled()) return { success: false, message: "Database disabled" };
  const saved = await saveImportFile(file, "types");
  if ("error" in saved) return { success: false, message: saved.error };
  const { name, text } = saved;
  const parsed = capImportRows(parseCsv(text));
  if ("error" in parsed) return { success: false, message: parsed.error };
  const rows = parsed;
  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const title = pick(row, "title", "name", "type", "project_type");
    if (!title) {
      skipped++;
      continue;
    }
    const existing = await prisma.projectType.findFirst({
      where: { title, isArchive: false },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.projectType.create({ data: { title } });
    created++;
  }

  return {
    success: true,
    message: `Project types import: ${created} created, ${skipped} skipped. File: ${name}`,
    created,
    skipped,
    file: name,
  };
}

export async function importUnitsCsv(file: File) {
  if (!isDatabaseEnabled()) return { success: false, message: "Database disabled" };
  const saved = await saveImportFile(file, "units");
  if ("error" in saved) return { success: false, message: saved.error };
  const { name, text } = saved;
  const parsed = capImportRows(parseCsv(text));
  if ("error" in parsed) return { success: false, message: parsed.error };
  const rows = parsed;
  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const projectId = Number(pick(row, "project_id", "projectId"));
    const title = pick(row, "title", "name");
    const price = Number(pick(row, "price") || "0");
    if (!projectId || !title) {
      skipped++;
      continue;
    }
    try {
      const project = await prisma.project.findFirst({
        where: { id: projectId, isArchive: false },
      });
      if (!project) {
        errors.push(`Row ${i + 2}: project ${projectId} not found`);
        skipped++;
        continue;
      }
      const unitTypeId = pick(row, "unit_type_id", "unitTypeId");
      await prisma.unit.create({
        data: {
          projectId,
          title,
          price,
          downPayment: Number(pick(row, "down_payment", "downPayment") || price) || price,
          monthlyInstallment:
            Number(pick(row, "monthly_installment", "monthlyInstallment") || "0") || 0,
          rooms: pick(row, "rooms") || null,
          unitTypeId: unitTypeId ? Number(unitTypeId) : null,
          isArchive: false,
        },
      });
      created++;
    } catch (e) {
      errors.push(`Row ${i + 2}: ${String(e)}`);
      skipped++;
    }
  }

  return {
    success: true,
    message: `Units import: ${created} created, ${skipped} skipped.${errors.length ? ` Errors: ${errors.slice(0, 3).join("; ")}` : ""} File: ${name}`,
    created,
    skipped,
    errors: errors.slice(0, 10),
    file: name,
  };
}
