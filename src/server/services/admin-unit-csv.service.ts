import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { prismaSql, queryRaw } from "@/lib/prisma-raw";
import { jsonNum, jsonNumOrNull } from "@/lib/prisma-json";
import { rowsToCsv } from "@/lib/csv-export";
import { isBlankCsvRow, parseCsvRows } from "@/lib/csv-parse";
import {
  buildUnitListWhere,
  listMeasurements,
  type Measurement,
  type UnitListFilters,
} from "@/server/services/admin-unit.service";

export const UNIT_CSV_MAX_ROWS = 50_000;
const CREATE_CHUNK = 1_000;
const UPDATE_CHUNK = 500;
const MAX_REPORTED_ERRORS = 200;

const COLUMNS = {
  unitId: "Unit ID",
  project: "Project",
  title: "Unit title",
  price: "Price",
  grossArea: "Gross area",
  netArea: "Net area",
  measurement: "Measurement unit",
} as const;

type ColumnKey = keyof typeof COLUMNS;

const HEADER_ALIASES: Record<ColumnKey, string[]> = {
  unitId: ["unitid", "id"],
  project: ["project", "projectname"],
  title: ["unittitle", "title", "unitname"],
  price: ["price", "unitprice"],
  grossArea: ["grossarea", "gross"],
  netArea: ["netarea", "net"],
  measurement: ["measurementunit", "measurement", "areaunit", "unitofmeasure"],
};

const MEASUREMENT_ALIASES = [
  ["sqft", "squarefeet", "squarefoot", "sft", "ft"],
  ["squareyard", "squareyards", "sqyd", "sqyard", "yard", "yards"],
  ["squaremeter", "squaremeters", "squaremetre", "sqm", "sqmeter", "m2"],
  ["marla", "marlas"],
  ["kanal", "kanals"],
];

export type UnitCsvIssue = { row: number; message: string };

export type UnitCsvImportResult = {
  dryRun: boolean;
  totalRows: number;
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  errors: UnitCsvIssue[];
};

type ProjectRef = { id: number; name: string; projectTypeId: number | null; archived: boolean };

type ExistingUnit = {
  id: number;
  projectId: number;
  title: string;
  price: number;
  total: number | null;
  loan: number;
  gross: number | null;
  net: number | null;
  measurementId: number;
};

type PlannedCreate = {
  projectId: number;
  title: string;
  price: number;
  gross: number | null;
  net: number | null;
  measurementId: number;
  unitTypeId: number | null;
};

type PlannedUpdate = Omit<ExistingUnit, "loan">;

type RowPlan =
  | { kind: "create"; unit: PlannedCreate; key: string }
  | { kind: "update"; unit: PlannedUpdate }
  | { kind: "unchanged"; unitId: number }
  | { kind: "error"; message: string };

const headerKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const nameKey = (value: string) =>
  value.normalize("NFKC").toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, " ").trim();

const unitKey = (projectId: number, title: string) => `${projectId}\u0000${nameKey(title)}`;

const round2 = (n: number) => Math.round(n * 100) / 100;

const sameNumber = (a: number | null, b: number | null) =>
  a == null || b == null ? a === b : Math.abs(a - b) < 0.005;

/** Undoes the spreadsheet-injection guard that the export adds to cells like "=…". */
const cleanCell = (value: string | undefined) => (value ?? "").trim().replace(/^'(?=[=+\-@])/, "");

/** undefined = blank cell (keep the current value); null = not a valid amount. */
function parseAmount(raw: string): number | undefined | null {
  const text = raw.toLowerCase().replace(/pkr|rs\.?|,|\s/g, "");
  if (!text) return undefined;
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  return Number(text);
}

function formatArea(stored: number | null, convertor: number): number | "" {
  return stored == null || stored <= 0 ? "" : round2(stored / (convertor || 1));
}

function measurementResolver(measurements: Measurement[]) {
  const byKey = new Map<string, Measurement>();
  for (const m of measurements) {
    const key = headerKey(m.name);
    byKey.set(key, m);
    const group = MEASUREMENT_ALIASES.find((aliases) => aliases.includes(key));
    group?.forEach((alias) => byKey.has(alias) || byKey.set(alias, m));
  }
  return (raw: string) => byKey.get(headerKey(raw)) ?? null;
}

export async function exportUnitsCsv(filters: UnitListFilters): Promise<string> {
  const header = Object.values(COLUMNS);
  if (filters.projectIds && filters.projectIds.length === 0) return `﻿${rowsToCsv(header, [])}`;

  const { where, params } = buildUnitListWhere(filters);
  const [rows, measurements] = await Promise.all([
    queryRaw<
      {
        id: unknown;
        title: string | null;
        price: unknown;
        gross_area: unknown;
        covered_area: unknown;
        net_area: unknown;
        measurement_type: unknown;
        project_name: string | null;
      }[]
    >(
      `SELECT u.id, u.title, u.price, u.gross_area, u.covered_area, u.net_area, u.measurement_type,
              p.name AS project_name
       FROM units u
       LEFT JOIN projects p ON p.id = u.project_id
       WHERE ${where}
       ORDER BY p.name ASC, u.id ASC
       LIMIT ?`,
      ...params,
      UNIT_CSV_MAX_ROWS
    ),
    listMeasurements(),
  ]);

  const byId = new Map(measurements.map((m) => [m.id, m]));
  const fallback = byId.get(1) ?? measurements[0];

  const data = rows.map((r) => {
    const m = byId.get(jsonNum(r.measurement_type)) ?? fallback;
    return {
      [COLUMNS.unitId]: jsonNum(r.id),
      [COLUMNS.project]: r.project_name ?? "",
      [COLUMNS.title]: r.title ?? "",
      [COLUMNS.price]: jsonNumOrNull(r.price) ?? "",
      [COLUMNS.grossArea]: formatArea(
        jsonNumOrNull(r.gross_area) ?? jsonNumOrNull(r.covered_area),
        m.convertor
      ),
      [COLUMNS.netArea]: formatArea(jsonNumOrNull(r.net_area), m.convertor),
      [COLUMNS.measurement]: m.name,
    };
  });

  return `﻿${rowsToCsv(header, data)}`;
}

async function loadImportContext(projectIds?: number[]) {
  const scope = projectIds ? `WHERE id IN (${projectIds.map(() => "?").join(",")})` : "";
  const unitScope = projectIds
    ? `AND project_id IN (${projectIds.map(() => "?").join(",")})`
    : "";
  const scopeParams = projectIds ?? [];

  const [projectRows, unitRows, measurements] = await Promise.all([
    queryRaw<{ id: unknown; name: string; project_type_id: unknown; is_archive: unknown }[]>(
      `SELECT id, name, project_type_id, is_archive FROM projects ${scope}`,
      ...scopeParams
    ),
    queryRaw<
      {
        id: unknown;
        project_id: unknown;
        title: string | null;
        price: unknown;
        total_unit_amount: unknown;
        loan_amount: unknown;
        gross_area: unknown;
        covered_area: unknown;
        net_area: unknown;
        measurement_type: unknown;
      }[]
    >(
      `SELECT id, project_id, title, price, total_unit_amount, loan_amount, gross_area, covered_area,
              net_area, measurement_type
       FROM units WHERE is_archive = 0 ${unitScope}`,
      ...scopeParams
    ),
    listMeasurements(),
  ]);

  const projectsByName = new Map<string, ProjectRef[]>();
  for (const r of projectRows) {
    const project: ProjectRef = {
      id: jsonNum(r.id),
      name: r.name,
      projectTypeId: jsonNumOrNull(r.project_type_id),
      archived: Boolean(jsonNum(r.is_archive)),
    };
    const key = nameKey(r.name);
    projectsByName.set(key, [...(projectsByName.get(key) ?? []), project]);
  }

  const unitsById = new Map<number, ExistingUnit>();
  const unitIdsByKey = new Map<string, number[]>();
  for (const r of unitRows) {
    const unit: ExistingUnit = {
      id: jsonNum(r.id),
      projectId: jsonNum(r.project_id),
      title: r.title ?? "",
      price: jsonNum(r.price),
      total: jsonNumOrNull(r.total_unit_amount),
      loan: jsonNum(r.loan_amount),
      gross: jsonNumOrNull(r.gross_area) ?? jsonNumOrNull(r.covered_area),
      net: jsonNumOrNull(r.net_area),
      measurementId: jsonNum(r.measurement_type) || 1,
    };
    unitsById.set(unit.id, unit);
    const key = unitKey(unit.projectId, unit.title);
    unitIdsByKey.set(key, [...(unitIdsByKey.get(key) ?? []), unit.id]);
  }

  const measurementsById = new Map(measurements.map((m) => [m.id, m]));
  return {
    projectsByName,
    unitsById,
    unitIdsByKey,
    measurementsById,
    defaultMeasurement: measurementsById.get(1) ?? measurements[0],
    resolveMeasurement: measurementResolver(measurements),
  };
}

type ImportContext = Awaited<ReturnType<typeof loadImportContext>>;
type CellReader = (key: ColumnKey) => string;

function resolveProject(ctx: ImportContext, raw: string): ProjectRef | string {
  const matches = ctx.projectsByName.get(nameKey(raw));
  if (!matches) return `Project "${raw}" not found`;
  const live = matches.filter((p) => !p.archived);
  const candidates = live.length ? live : matches;
  if (candidates.length > 1) return `More than one project is named "${raw}"`;
  return candidates[0];
}

function planRow(ctx: ImportContext, cell: CellReader): RowPlan {
  const error = (message: string): RowPlan => ({ kind: "error", message });
  const title = cell("title");
  const unitIdRaw = cell("unitId");
  const projectRaw = cell("project");

  let project: ProjectRef | null = null;
  if (projectRaw) {
    const resolved = resolveProject(ctx, projectRaw);
    if (typeof resolved === "string") return error(resolved);
    project = resolved;
  }

  let existing: ExistingUnit | undefined;
  if (unitIdRaw) {
    const id = Number(unitIdRaw);
    if (!Number.isInteger(id) || id <= 0) return error(`Unit ID "${unitIdRaw}" is not a number`);
    existing = ctx.unitsById.get(id);
    if (!existing) return error(`Unit ID ${id} not found`);
    if (project && project.id !== existing.projectId) {
      return error(`Unit ID ${id} belongs to a different project`);
    }
  } else {
    if (!project) return error("Project is required");
    if (!title) return error("Unit title is required");
    const ids = ctx.unitIdsByKey.get(unitKey(project.id, title));
    if (ids && ids.length > 1) {
      return error(`Several units in "${project.name}" are titled "${title}"; add the Unit ID`);
    }
    existing = ids ? ctx.unitsById.get(ids[0]) : undefined;
  }

  const measurementRaw = cell("measurement");
  const measurement = measurementRaw
    ? ctx.resolveMeasurement(measurementRaw)
    : (existing && ctx.measurementsById.get(existing.measurementId)) || ctx.defaultMeasurement;
  if (!measurement) return error(`Unknown measurement unit "${measurementRaw}"`);

  const price = parseAmount(cell("price"));
  const gross = parseAmount(cell("grossArea"));
  const net = parseAmount(cell("netArea"));
  if (price === null) return error("Price is not a valid number");
  if (gross === null) return error("Gross area is not a valid number");
  if (net === null) return error("Net area is not a valid number");

  const toStored = (value: number) => (value > 0 ? round2(value * measurement.convertor) : null);

  if (existing) {
    const nextPrice = price ?? existing.price;
    const priceChanged = !sameNumber(nextPrice, existing.price);
    const next: PlannedUpdate = {
      id: existing.id,
      projectId: existing.projectId,
      title: title || existing.title,
      price: nextPrice,
      total: priceChanged ? round2(nextPrice + existing.loan) : existing.total,
      gross: gross === undefined ? existing.gross : toStored(gross),
      net: net === undefined ? existing.net : toStored(net),
      measurementId: measurement.id,
    };
    const changed =
      next.title !== existing.title ||
      priceChanged ||
      !sameNumber(next.gross, existing.gross) ||
      !sameNumber(next.net, existing.net) ||
      next.measurementId !== existing.measurementId;
    return changed ? { kind: "update", unit: next } : { kind: "unchanged", unitId: existing.id };
  }

  if (!project) return error("Project is required");
  if (price === undefined) return error("Price is required for a new unit");
  return {
    kind: "create",
    key: unitKey(project.id, title),
    unit: {
      projectId: project.id,
      title,
      price,
      gross: gross === undefined ? null : toStored(gross),
      net: net === undefined ? null : toStored(net),
      measurementId: measurement.id,
      unitTypeId: project.projectTypeId,
    },
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const UPDATE_COLUMNS: [string, (u: PlannedUpdate) => unknown][] = [
  ["title", (u) => u.title],
  ["price", (u) => u.price],
  ["total_unit_amount", (u) => u.total],
  ["gross_area", (u) => u.gross],
  ["covered_area", (u) => u.gross],
  ["net_area", (u) => u.net],
  ["measurement_type", (u) => u.measurementId],
];

/** One UPDATE … CASE statement for a whole chunk instead of one query per unit. */
function bulkUpdateSql(units: PlannedUpdate[]): Prisma.Sql {
  const params: unknown[] = [];
  const sets = UPDATE_COLUMNS.map(([column, value]) => {
    const whens = units.map((u) => {
      params.push(u.id, value(u));
      return "WHEN ? THEN ?";
    });
    return `${column} = CASE id ${whens.join(" ")} END`;
  });
  params.push(...units.map((u) => u.id));
  return prismaSql(
    `UPDATE units SET ${sets.join(", ")}, updated_at = NOW()
     WHERE id IN (${units.map(() => "?").join(",")})`,
    ...params
  );
}

/** Same rule as the unit form: a project's min price only moves down to its cheapest unit. */
function syncMinPriceSql(projectIds: number[]): Prisma.Sql {
  return prismaSql(
    `UPDATE projects p
     JOIN (
       SELECT project_id, MIN(price) AS min_unit_price
       FROM units
       WHERE is_archive = 0 AND price > 0 AND project_id IN (${projectIds.map(() => "?").join(",")})
       GROUP BY project_id
     ) x ON x.project_id = p.id
     SET p.min_price = CASE
       WHEN p.min_price IS NULL OR p.min_price = 0 OR p.min_price > x.min_unit_price
       THEN x.min_unit_price ELSE p.min_price END`,
    ...projectIds
  );
}

async function writePlan(creates: PlannedCreate[], updates: PlannedUpdate[]) {
  const touchedProjects = new Set<number>([
    ...creates.map((c) => c.projectId),
    ...updates.map((u) => u.projectId),
  ]);
  const now = new Date();

  await prisma.$transaction(
    async (tx) => {
      for (const batch of chunk(creates, CREATE_CHUNK)) {
        await tx.unit.createMany({
          data: batch.map((c) => ({
            projectId: c.projectId,
            title: c.title,
            price: c.price,
            totalUnitAmount: c.price,
            loanAmount: 0,
            grossArea: c.gross,
            size: c.gross,
            netArea: c.net,
            measurementType: c.measurementId,
            unitTypeId: c.unitTypeId,
            installmentType: 1,
            isArchive: false,
            createdAt: now,
            updatedAt: now,
          })),
        });
      }
      for (const batch of chunk(updates, UPDATE_CHUNK)) {
        await tx.$executeRaw(bulkUpdateSql(batch));
      }
      for (const batch of chunk([...touchedProjects], UPDATE_CHUNK)) {
        await tx.$executeRaw(syncMinPriceSql(batch));
      }
    },
    { maxWait: 10_000, timeout: 180_000 }
  );
}

export async function importUnitsCsv(
  text: string,
  options: { dryRun: boolean; projectIds?: number[] }
): Promise<UnitCsvImportResult | { error: string }> {
  const records = parseCsvRows(text);
  const headerIndex = records.findIndex((r) => !isBlankCsvRow(r));
  if (headerIndex < 0) return { error: "The file is empty" };

  const columns: Partial<Record<ColumnKey, number>> = {};
  records[headerIndex].forEach((raw, idx) => {
    const key = headerKey(raw);
    const match = (Object.keys(HEADER_ALIASES) as ColumnKey[]).find((k) =>
      HEADER_ALIASES[k].includes(key)
    );
    if (match && columns[match] == null) columns[match] = idx;
  });
  if (columns.title == null || (columns.project == null && columns.unitId == null)) {
    return {
      error: `Missing columns. Use the export's header row: ${Object.values(COLUMNS).join(", ")}`,
    };
  }

  const dataRows: { row: number; cells: string[] }[] = [];
  for (let i = headerIndex + 1; i < records.length; i++) {
    if (!isBlankCsvRow(records[i])) dataRows.push({ row: i + 1, cells: records[i] });
  }
  if (!dataRows.length) return { error: "No data rows found under the header" };
  if (dataRows.length > UNIT_CSV_MAX_ROWS) {
    return {
      error: `The file has ${dataRows.length.toLocaleString()} rows; the limit is ${UNIT_CSV_MAX_ROWS.toLocaleString()}`,
    };
  }

  const ctx = await loadImportContext(options.projectIds);
  const creates: PlannedCreate[] = [];
  const updates: PlannedUpdate[] = [];
  const errors: UnitCsvIssue[] = [];
  const firstRowForUnit = new Map<number, number>();
  const firstRowForNewKey = new Map<string, number>();
  let unchanged = 0;
  let failed = 0;

  const fail = (row: number, message: string) => {
    failed++;
    if (errors.length < MAX_REPORTED_ERRORS) errors.push({ row, message });
  };

  for (const { row, cells } of dataRows) {
    const cell: CellReader = (key) => {
      const idx = columns[key];
      return idx == null ? "" : cleanCell(cells[idx]);
    };
    const plan = planRow(ctx, cell);

    if (plan.kind === "error") {
      fail(row, plan.message);
      continue;
    }
    if (plan.kind === "create") {
      const seen = firstRowForNewKey.get(plan.key);
      if (seen) {
        fail(row, `Same new unit as row ${seen}`);
        continue;
      }
      firstRowForNewKey.set(plan.key, row);
      creates.push(plan.unit);
      continue;
    }

    const unitId = plan.kind === "update" ? plan.unit.id : plan.unitId;
    const seen = firstRowForUnit.get(unitId);
    if (seen) {
      fail(row, `Same unit as row ${seen}`);
      continue;
    }
    firstRowForUnit.set(unitId, row);
    if (plan.kind === "update") updates.push(plan.unit);
    else unchanged++;
  }

  if (!options.dryRun && (creates.length || updates.length)) {
    await writePlan(creates, updates);
  }

  return {
    dryRun: options.dryRun,
    totalRows: dataRows.length,
    created: creates.length,
    updated: updates.length,
    unchanged,
    failed,
    errors,
  };
}
