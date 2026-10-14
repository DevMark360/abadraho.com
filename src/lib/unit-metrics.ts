import { unitStartPrice } from "@/lib/project-list-card";
import type { ProjectUnit, UnitRoomRow } from "@/types/project-detail";

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

/** Total amount (same basis as "Price from") over gross area; no gross area, no rate. */
export function unitPricePerSqFt(
  unit: Pick<ProjectUnit, "grossArea" | "price" | "totalUnitAmount">
): number | null {
  const price = unitStartPrice(unit);
  return price != null && unit.grossArea && unit.grossArea > 0
    ? Math.round(price / unit.grossArea)
    : null;
}

export function formatSqFt(value: number): string {
  return `${Math.round(value).toLocaleString("en-PK")} sq.ft`;
}

/** "3 Bed, 2 Bath, 1 Kitchen": room rows grouped by type (first-seen order), quantities added up. */
export function summarizeRoomTypes(rooms: Pick<UnitRoomRow, "roomTypeName" | "count">[]): string {
  const totals = new Map<string, number>();
  for (const room of rooms) {
    const name = room.roomTypeName.trim();
    if (!name) continue;
    const qty = Number.parseInt(room.count ?? "", 10);
    totals.set(name, (totals.get(name) ?? 0) + (qty > 0 ? qty : 1));
  }
  return [...totals].map(([name, qty]) => `${qty} ${name}`).join(", ");
}
