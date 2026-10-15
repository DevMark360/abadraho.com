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

/**
 * Room types per layout / floor for a unit with room groups, one line each:
 * "Layout 1: 1 Lounge, 4 Bed" and "Layout 2: 1 Lounge, 4 Bed" on separate lines.
 * Units without groups get the plain summary.
 */
export function summarizeRoomTypesByGroup(
  unit: Pick<ProjectUnit, "roomBreakdown" | "roomGroups">
): string {
  const groups = unit.roomGroups ?? [];
  if (!groups.length) return summarizeRoomTypes(unit.roomBreakdown);
  const known = new Set(groups.map((g) => g.id));
  const sections = [
    ...groups.map((g) => ({ name: g.name, rooms: unit.roomBreakdown.filter((r) => r.groupId === g.id) })),
    {
      name: "Other rooms",
      rooms: unit.roomBreakdown.filter((r) => r.groupId == null || !known.has(r.groupId)),
    },
  ]
    .map((s) => ({ name: s.name, summary: summarizeRoomTypes(s.rooms) }))
    .filter((s) => s.summary);
  if (sections.length <= 1) return sections[0]?.summary ?? "";
  return sections.map((s) => `${s.name}: ${s.summary}`).join("\n");
}

