import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { jsonNum, jsonNumOrNull } from "@/lib/prisma-json";
import { tableExists } from "@/lib/db-table-exists";
import { unitPlanImageUrl } from "@/lib/unit-media";

export type UnitListFilters = {
  page?: number;
  perPage?: number;
  projectId?: number;
  q?: string;
  /** When set, only units belonging to these projects are returned (builder scope). */
  projectIds?: number[];
};

export type UnitFormPayload = {
  projectId: number;
  title: string;
  rooms?: string;
  grossArea?: number | null;
  netArea?: number | null;
  measurementTypeId?: number | null;
  unitTypeId: number;
  price: number;
  loanAmount?: number;
  downPayment: number;
  monthlyInstallment: number;
  installmentTypeId?: number | null;
  installmentLength?: number | null;
  description?: string;
};

export type UnitRoomPayload = {
  roomTypeId: number;
  widthFeet: number;
  widthInches: number;
  lengthFeet: number;
  lengthInches: number;
  coveredArea?: number | null;
  extras?: string;
};

function dec(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "object" && v !== null && "toNumber" in v) {
    return Number((v as { toNumber: () => number }).toNumber());
  }
  return Number(v);
}

const DEFAULT_INSTALLMENT_TYPES = [
  { id: 1, name: "Monthly" },
  { id: 2, name: "Quarterly" },
  { id: 3, name: "Half Yearly" },
] as const;

const DEFAULT_MEASUREMENTS = [
  { id: 1, name: "Sq Ft", convertor: 1 },
  { id: 2, name: "Square Yard", convertor: 9 },
  { id: 3, name: "Square Meter", convertor: 10.7639 },
  { id: 4, name: "Marla", convertor: 272.251 },
  { id: 5, name: "Kanal", convertor: 5445 },
] as const;

async function measurementConvertor(id: number | null | undefined): Promise<number> {
  const numericId = jsonNumOrNull(id) ?? 1;
  if (await tableExists("measurements")) {
    const rows = await queryRaw<{ convertor: unknown }[]>(
      `SELECT convertor FROM measurements WHERE id = ? LIMIT 1`,
      numericId
    );
    const fromDb = jsonNum(rows[0]?.convertor);
    if (fromDb > 0) return fromDb;
  }
  return DEFAULT_MEASUREMENTS.find((m) => m.id === numericId)?.convertor ?? 1;
}

async function areaToDb(
  input: number | null | undefined,
  measurementTypeId: number | null | undefined
): Promise<number | null> {
  if (input == null || input === 0) return null;
  const factor = await measurementConvertor(measurementTypeId ?? 1);
  return input * factor;
}

function areaFromDb(
  stored: number | null,
  convertor: number
): number | null {
  if (stored == null) return null;
  return stored / (convertor || 1);
}

function unitGrossFromDb(
  unit: { grossArea?: unknown; size?: unknown },
  convertor: number
): number | null {
  const gross = dec(unit.grossArea);
  if (gross != null) return areaFromDb(gross, convertor);
  return areaFromDb(dec(unit.size), convertor);
}

function unitNetFromDb(unit: { netArea?: unknown }, convertor: number): number | null {
  return areaFromDb(dec(unit.netArea), convertor);
}

export async function loadUnitFormMeta(options?: { projectIds?: number[] }) {
  const scopedProjectIds = options?.projectIds;
  if (scopedProjectIds && scopedProjectIds.length === 0) {
    return {
      projectTypes: [],
      roomTypes: [],
      projects: [],
      measurements: [...DEFAULT_MEASUREMENTS],
      installmentTypes: [...DEFAULT_INSTALLMENT_TYPES],
    };
  }

  try {
    const [projectTypes, roomTypes, projects] = await Promise.all([
      prisma.projectType.findMany({
        where: { isArchive: false },
        orderBy: { title: "asc" },
        select: { id: true, title: true },
      }),
      prisma.roomType.findMany({
        where: { isArchive: false },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, icon: true },
      }),
      prisma.project.findMany({
        where: {
          isArchive: false,
          ...(scopedProjectIds?.length ? { id: { in: scopedProjectIds } } : {}),
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
        take: 500,
      }),
    ]);

    let measurements: { id: number; name: string; convertor: number }[] = [
      ...DEFAULT_MEASUREMENTS,
    ];
    if (await tableExists("measurements")) {
      const rows = await queryRaw<
        { id: unknown; name: string; convertor: unknown }[]
      >(`SELECT id, name, convertor FROM measurements ORDER BY id ASC`);
      if (rows.length) {
        measurements = rows.map((r) => ({
          id: jsonNum(r.id),
          name: r.name,
          convertor: jsonNum(r.convertor) || 1,
        }));
      }
    }

    let installmentTypes: { id: number; name: string }[] = [...DEFAULT_INSTALLMENT_TYPES];
    for (const table of ["installment_types", "installment_type"]) {
      if (await tableExists(table)) {
        const rows = await queryRaw<{ id: unknown; name: string }[]>(
          `SELECT id, name FROM \`${table}\` ORDER BY id ASC`
        );
        if (rows.length) {
          installmentTypes = rows.map((r) => ({
            id: jsonNum(r.id),
            name: r.name,
          }));
        }
        break;
      }
    }

    return {
      projectTypes: projectTypes.map((t) => ({
        id: jsonNum(t.id),
        title: t.title,
      })),
      roomTypes: roomTypes.map((r) => ({
        id: jsonNum(r.id),
        name: r.name,
        icon: r.icon,
      })),
      projects: projects.map((p) => ({
        id: jsonNum(p.id),
        name: p.name,
        slug: p.slug,
      })),
      measurements,
      installmentTypes,
    };
  } catch (e) {
    return {
      projectTypes: [],
      roomTypes: [],
      projects: [],
      measurements: [...DEFAULT_MEASUREMENTS],
      installmentTypes: [...DEFAULT_INSTALLMENT_TYPES],
      error: String(e),
    };
  }
}

export async function listAdminUnits(filters: UnitListFilters = {}) {
  if (!isDatabaseEnabled()) return { items: [], total: 0, error: "Database disabled" };

  if (filters.projectIds && filters.projectIds.length === 0) {
    return { items: [], total: 0 };
  }

  const page = filters.page ?? 1;
  const perPage = Math.min(filters.perPage ?? 25, 100);
  const skip = (page - 1) * perPage;

  const conditions = ["u.is_archive = 0"];
  const params: unknown[] = [];

  if (filters.projectId) {
    conditions.push("u.project_id = ?");
    params.push(filters.projectId);
  }
  if (filters.projectIds?.length) {
    conditions.push(`u.project_id IN (${filters.projectIds.map(() => "?").join(",")})`);
    params.push(...filters.projectIds);
  }
  if (filters.q?.trim()) {
    conditions.push("(u.title LIKE ? OR p.name LIKE ?)");
    const like = `%${filters.q.trim()}%`;
    params.push(like, like);
  }

  const where = conditions.join(" AND ");

  try {
    const countRows = await queryRaw<{ cnt: bigint }[]>(
      `SELECT COUNT(*) AS cnt FROM units u
       LEFT JOIN projects p ON p.id = u.project_id
       WHERE ${where}`,
      ...params
    );
    const total = Number(countRows[0]?.cnt ?? 0);

    const rows = await queryRaw<
      {
        id: number;
        project_id: number;
        title: string | null;
        price: unknown;
        rooms: string | null;
        covered_area: unknown;
        project_name: string | null;
        unit_type_title: string | null;
      }[]
    >(
      `SELECT u.id, u.project_id, u.title, u.price, u.rooms,
              u.gross_area, u.net_area, u.covered_area,
              p.name AS project_name, pt.title AS unit_type_title
       FROM units u
       LEFT JOIN projects p ON p.id = u.project_id
       LEFT JOIN project_type pt ON pt.id = u.unit_type_id
       WHERE ${where}
       ORDER BY u.id DESC
       LIMIT ? OFFSET ?`,
      ...params,
      perPage,
      skip
    );

    const items = rows.map((r, i) => ({
      rowNum: skip + i + 1,
      id: jsonNum(r.id),
      projectId: jsonNum(r.project_id),
      projectName: r.project_name,
      title: r.title,
      price: dec(r.price),
      rooms: r.rooms,
      grossArea: dec((r as { gross_area?: unknown }).gross_area) ?? dec(r.covered_area),
      netArea: dec((r as { net_area?: unknown }).net_area),
      unitTypeTitle: r.unit_type_title,
    }));

    return { items, total };
  } catch (e) {
    return { items: [], total: 0, error: String(e) };
  }
}

export async function getAdminUnit(id: number) {
  if (!isDatabaseEnabled()) return { unit: null, error: "Database disabled" };

  let unit;
  try {
    unit = await prisma.unit.findFirst({
      where: { id, isArchive: false },
      include: {
        project: { select: { id: true, name: true, slug: true, minPrice: true } },
        unitType: { select: { id: true, title: true } },
        roomTypeUnits: {
          where: { isArchive: false },
          include: { roomType: { select: { id: true, name: true, icon: true } } },
          orderBy: { id: "asc" },
        },
      },
    });
  } catch (e) {
    return { unit: null, error: String(e) };
  }

  if (!unit) return { unit: null, error: "Not found" };

  const convertor = await measurementConvertor(unit.measurementType);

  const unitRooms = unit.roomTypeUnits.map((r) => ({
    id: jsonNum(r.id),
    roomTypeId: jsonNum(r.roomTypeId),
    roomTypeName: r.roomType?.name ?? "",
    roomTypeIcon: r.roomType?.icon ?? null,
    widthFeet: jsonNumOrNull(r.widthFeet),
    widthInches: jsonNumOrNull(r.widthInches),
    lengthFeet: jsonNumOrNull(r.lengthFeet),
    lengthInches: jsonNumOrNull(r.lengthInches),
    coveredArea: dec(r.coveredArea),
    extras: r.extras,
    isDisplayOnListing: r.isDisplayOnListing,
  }));

  const projectId = jsonNum(unit.projectId);
  const unitId = jsonNum(unit.id);

  return {
    unit: {
      id: unitId,
      projectId,
      projectName: unit.project?.name ?? "",
      projectSlug: unit.project?.slug ?? "",
      title: unit.title ?? "",
      rooms: unit.rooms ?? "",
      grossArea: unitGrossFromDb(unit, convertor),
      netArea: unitNetFromDb(unit, convertor),
      measurementTypeId: jsonNumOrNull(unit.measurementType),
      unitTypeId: jsonNumOrNull(unit.unitTypeId),
      unitTypeTitle: unit.unitType?.title ?? null,
      price: dec(unit.price) ?? 0,
      loanAmount: dec(unit.loanAmount) ?? 0,
      totalUnitAmount: dec(unit.totalUnitAmount) ?? 0,
      downPayment: dec(unit.downPayment) ?? 0,
      monthlyInstallment: dec(unit.monthlyInstallment) ?? 0,
      installmentTypeId: jsonNumOrNull(unit.installmentType),
      installmentLength: dec(unit.installment),
      description: unit.description ?? "",
      floorPlanUrl: unitPlanImageUrl(projectId, unitId, unit.floorPlanImg),
      paymentPlanUrl: unitPlanImageUrl(projectId, unitId, unit.paymentPlanImg),
      floorPlanImg: unit.floorPlanImg,
      paymentPlanImg: unit.paymentPlanImg,
      unitRooms,
    },
  };
}

async function syncProjectMinPrice(projectId: number, unitPrice: number) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { minPrice: true },
  });
  if (!project) return;
  const min = dec(project.minPrice) ?? 0;
  if (min === 0 || min > unitPrice) {
    await prisma.project.update({
      where: { id: projectId },
      data: { minPrice: unitPrice },
    });
  }
}

export async function createAdminUnit(payload: UnitFormPayload) {
  if (!isDatabaseEnabled()) {
    throw new Error("Database is not enabled");
  }

  const gross = await areaToDb(payload.grossArea, payload.measurementTypeId);
  const net = await areaToDb(payload.netArea, payload.measurementTypeId);
  const price = payload.price ?? 0;
  const loan = payload.loanAmount ?? 0;

  const unit = await prisma.unit.create({
    data: {
      projectId: payload.projectId,
      title: payload.title,
      rooms: payload.rooms ?? null,
      grossArea: gross,
      netArea: net,
      size: gross,
      measurementType: payload.measurementTypeId ?? 1,
      unitTypeId: payload.unitTypeId,
      price,
      loanAmount: loan,
      totalUnitAmount: price + loan,
      downPayment: payload.downPayment,
      monthlyInstallment: payload.monthlyInstallment,
      installmentType: payload.installmentTypeId ?? 1,
      installment: payload.installmentLength ?? null,
      description: payload.description ?? null,
    },
  });

  await syncProjectMinPrice(payload.projectId, price);
  return { id: unit.id };
}

export async function updateAdminUnit(id: number, payload: UnitFormPayload) {
  const existing = await prisma.unit.findFirst({ where: { id, isArchive: false } });
  if (!existing) return { ok: false, error: "Not found" };

  const gross = await areaToDb(payload.grossArea, payload.measurementTypeId);
  const net = await areaToDb(payload.netArea, payload.measurementTypeId);
  const price = payload.price ?? 0;
  const loan = payload.loanAmount ?? 0;

  await prisma.unit.update({
    where: { id },
    data: {
      projectId: payload.projectId,
      title: payload.title,
      rooms: payload.rooms ?? null,
      grossArea: gross,
      netArea: net,
      size: gross,
      measurementType: payload.measurementTypeId ?? 1,
      unitTypeId: payload.unitTypeId,
      price,
      loanAmount: loan,
      totalUnitAmount: price + loan,
      downPayment: payload.downPayment,
      monthlyInstallment: payload.monthlyInstallment,
      installmentType: payload.installmentTypeId ?? 1,
      installment: payload.installmentLength ?? null,
      description: payload.description ?? null,
    },
  });

  await syncProjectMinPrice(payload.projectId, price);
  return { ok: true };
}

export async function archiveAdminUnit(id: number) {
  await prisma.unit.update({
    where: { id },
    data: { isArchive: true },
  });
}

function calcRoomCoveredArea(payload: UnitRoomPayload): number {
  if (payload.coveredArea != null && payload.coveredArea > 0) {
    return payload.coveredArea;
  }
  const w = payload.widthFeet + payload.widthInches / 12;
  const l = payload.lengthFeet + payload.lengthInches / 12;
  const single = w * l;
  const count = parseInt(payload.extras ?? "1", 10) || 1;
  return single * count;
}

export async function createUnitRoom(unitId: number, payload: UnitRoomPayload) {
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, isArchive: false },
    select: { id: true, projectId: true },
  });
  if (!unit) return { ok: false, error: "Unit not found" };

  const covered = calcRoomCoveredArea(payload);
  const row = await prisma.roomTypeUnit.create({
    data: {
      unitId: unit.id,
      projectId: unit.projectId,
      roomTypeId: payload.roomTypeId,
      widthFeet: payload.widthFeet,
      widthInches: payload.widthInches,
      lengthFeet: payload.lengthFeet,
      lengthInches: payload.lengthInches,
      coveredArea: covered,
      extras: payload.extras ?? "1",
      isDisplayOnListing: true,
    },
  });

  return { ok: true, id: row.id };
}

export async function updateUnitRoom(roomId: number, payload: UnitRoomPayload) {
  const existing = await prisma.roomTypeUnit.findFirst({
    where: { id: roomId, isArchive: false },
  });
  if (!existing) return { ok: false, error: "Room not found" };

  const covered = calcRoomCoveredArea(payload);

  await prisma.roomTypeUnit.update({
    where: { id: roomId },
    data: {
      roomTypeId: payload.roomTypeId,
      widthFeet: payload.widthFeet,
      widthInches: payload.widthInches,
      lengthFeet: payload.lengthFeet,
      lengthInches: payload.lengthInches,
      coveredArea: covered,
      extras: payload.extras ?? "1",
    },
  });

  return { ok: true };
}

export async function archiveUnitRoom(roomId: number) {
  await prisma.roomTypeUnit.update({
    where: { id: roomId },
    data: { isArchive: true },
  });
}
