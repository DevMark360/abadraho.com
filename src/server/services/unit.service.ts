import { isDatabaseEnabled } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { mapDbUnit, mapRoomTypeUnit } from "@/server/services/project-mapper";
import type { ProjectUnit } from "@/types/project-detail";

const unitInclude = {
  unitType: true,
  roomTypeUnits: {
    where: { isArchive: false, isDisplayOnListing: true },
    include: { roomType: true },
  },
} as const;

export async function getUnitsByProjectId(projectId: number): Promise<ProjectUnit[]> {
  if (!isDatabaseEnabled()) return [];
  const units = await prisma.unit.findMany({
    where: { projectId, isArchive: false },
    include: unitInclude,
    orderBy: { id: "asc" },
  });
  return units.map((u) => mapDbUnit(u, projectId));
}

export async function getUnitById(unitId: number): Promise<ProjectUnit | null> {
  if (!isDatabaseEnabled()) return null;
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, isArchive: false },
    include: unitInclude,
  });
  return unit ? mapDbUnit(unit, unit.projectId) : null;
}

/** Raw unit rows for legacy /getunits JSON shape */
export async function getUnitsRaw(
  projectId?: number,
  unitId?: number
): Promise<Record<string, unknown>[]> {
  if (!isDatabaseEnabled()) return [];
  if (unitId) {
    const u = await prisma.unit.findFirst({ where: { id: unitId } });
    return u ? [serializeUnit(u)] : [];
  }
  if (projectId) {
    const list = await prisma.unit.findMany({
      where: { projectId, isArchive: false },
    });
    return list.map(serializeUnit);
  }
  return [];
}

function serializeUnit(u: {
  id: number;
  projectId: number;
  unitTypeId: number | null;
  title: string | null;
  rooms: string | null;
  price: unknown;
  downPayment: unknown;
  monthlyInstallment: unknown;
  grossArea?: unknown;
  netArea?: unknown;
  size: unknown;
  isArchive: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}): Record<string, unknown> {
  const n = (v: unknown) =>
    v != null && typeof v === "object" && "toNumber" in (v as object)
      ? Number(v)
      : v != null
        ? Number(v)
        : null;
  return {
    id: u.id,
    project_id: u.projectId,
    unit_type_id: u.unitTypeId,
    title: u.title,
    rooms: u.rooms,
    price: n(u.price),
    down_payment: n(u.downPayment),
    monthly_installment: n(u.monthlyInstallment),
    covered_area: n(u.grossArea) ?? n(u.size),
    gross_area: n(u.grossArea) ?? n(u.size),
    net_area: n(u.netArea),
    is_archive: u.isArchive ? 1 : 0,
    created_at: u.createdAt?.toISOString() ?? null,
    updated_at: u.updatedAt?.toISOString() ?? null,
  };
}

export { mapRoomTypeUnit };
