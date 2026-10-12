import { designTw } from "@/config/design-tokens";
import { RoomTypeIcon } from "@/lib/room-type-icon";
import { formatSqFt, unitTotalCoveredArea } from "@/lib/unit-metrics";
import { cn } from "@/lib/utils";
import type { ProjectUnit } from "@/types/project-detail";

export function UnitRoomsTable({
  unit,
  compact = false,
}: {
  unit: Pick<ProjectUnit, "roomBreakdown">;
  compact?: boolean;
}) {
  if (!unit.roomBreakdown.length) {
    return (
      <p className={cn("text-center text-sm text-zinc-500", compact ? "py-4" : "py-8")}>
        No unit room details.
      </p>
    );
  }

  const cell = compact ? "px-3 py-2.5" : "px-4 py-3";
  const totalArea = unitTotalCoveredArea(unit);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={designTw.tableHead}>Name</th>
            <th className={designTw.tableHead}>Width × Length</th>
            <th className={designTw.tableHead}>Covered area</th>
          </tr>
        </thead>
        <tbody>
          {unit.roomBreakdown.map((r, i) => (
            <tr key={i} className="border-b border-zinc-100">
              <td className={cn(cell, "font-medium text-zinc-900")}>
                <RoomTypeIcon icon={r.icon} className={cn("text-zinc-600", compact ? "mr-1.5" : "mr-2")} />
                {r.roomTypeName}
                {r.count ? ` (${r.count})` : ""}
              </td>
              <td className={cn(cell, "text-zinc-700")}>{r.dimensions ?? "—"}</td>
              <td className={cn(cell, "text-zinc-700")}>
                {r.coveredArea != null ? `${r.coveredArea} sq.ft` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
        {totalArea != null ? (
          <tfoot>
            <tr className="border-t-2 border-zinc-200 bg-zinc-50/80">
              <td colSpan={2} className={cn(cell, "font-semibold text-zinc-900")}>
                Total area
              </td>
              <td className={cn(cell, "font-semibold text-zinc-900")}>{formatSqFt(totalArea)}</td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
