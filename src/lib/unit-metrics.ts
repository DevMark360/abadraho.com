import { unitStartPrice } from "@/lib/project-list-card";
import type { ProjectUnit } from "@/types/project-detail";

type UnitAreaFields = Pick<ProjectUnit, "grossArea" | "netArea" | "roomBreakdown">;

export function unitInstallmentMonths(
  unit: Pick<ProjectUnit, "installmentMonths">,
  projectMonths?: number | null
): number | null {
  return unit.installmentMonths || projectMonths || null;
}

export function unitTotalCoveredArea(unit: Pick<ProjectUnit, "roomBreakdown">): number | null {
  let total = 0;
  for (const room of unit.roomBreakdown) {
    if (room.coveredArea != null && room.coveredArea > 0) total += room.coveredArea;
  }
  return total > 0 ? total : null;
}

export function unitAreaSqFt(unit: UnitAreaFields): number | null {
  return unit.grossArea || unit.netArea || unitTotalCoveredArea(unit);
}

/** Rate on what the buyer pays in total (same basis as "Price from"). */
export function unitPricePerSqFt(
  unit: UnitAreaFields & Pick<ProjectUnit, "price" | "totalUnitAmount">
): number | null {
  const price = unitStartPrice(unit);
  const area = unitAreaSqFt(unit);
  return price != null && area ? Math.round(price / area) : null;
}

export function formatSqFt(value: number): string {
  return `${Math.round(value).toLocaleString("en-PK")} sq.ft`;
}
