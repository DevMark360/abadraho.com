"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { designTw } from "@/config/design-tokens";
import { RoomTypeIcon } from "@/lib/room-type-icon";
import { cn } from "@/lib/utils";
import type { ProjectUnit, UnitRoomRow } from "@/types/project-detail";

type RoomSection = { key: string; name: string; rooms: UnitRoomRow[] };

/** Rooms split by the unit's groups (layouts / floors) in order; null when the unit has none. */
function roomSections(unit: Pick<ProjectUnit, "roomBreakdown" | "roomGroups">): RoomSection[] | null {
  const groups = unit.roomGroups ?? [];
  if (!groups.length) return null;
  const known = new Set(groups.map((g) => g.id));
  const sections: RoomSection[] = groups.map((g) => ({
    key: String(g.id),
    name: g.name,
    rooms: unit.roomBreakdown.filter((r) => r.groupId === g.id),
  }));
  const rest = unit.roomBreakdown.filter((r) => r.groupId == null || !known.has(r.groupId));
  if (rest.length) sections.push({ key: "other", name: "Other rooms", rooms: rest });
  const filled = sections.filter((s) => s.rooms.length);
  return filled.length ? filled : null;
}

function RoomRows({ rooms, cell, compact }: { rooms: UnitRoomRow[]; cell: string; compact: boolean }) {
  return rooms.map((r, i) => (
    <tr key={r.id ?? i} className="border-b border-zinc-100">
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
  ));
}

export function UnitRoomsTable({
  unit,
  compact = false,
}: {
  unit: Pick<ProjectUnit, "roomBreakdown" | "roomGroups">;
  compact?: boolean;
}) {
  // Groups start open; this holds the ones a visitor closed.
  const [closed, setClosed] = useState<ReadonlySet<string>>(() => new Set());

  if (!unit.roomBreakdown.length) {
    return (
      <p className={cn("text-center text-sm text-zinc-500", compact ? "py-4" : "py-8")}>
        No unit room details.
      </p>
    );
  }

  const cell = compact ? "px-3 py-2.5" : "px-4 py-3";
  const sections = roomSections(unit);
  const toggle = (key: string) =>
    setClosed((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });

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
        {sections ? (
          sections.map((section) => {
            const open = !closed.has(section.key);
            return (
              <tbody key={section.key}>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <td colSpan={3} className="p-0">
                    <button
                      type="button"
                      onClick={() => toggle(section.key)}
                      aria-expanded={open}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 text-left transition-colors hover:bg-zinc-100",
                        cell
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span aria-hidden className="h-4 w-1 rounded-full bg-brand-accent" />
                        <span className="font-semibold text-zinc-900">{section.name}</span>
                        <span className="text-xs font-medium text-zinc-500">
                          {section.rooms.length} {section.rooms.length === 1 ? "room" : "rooms"}
                        </span>
                      </span>
                      <ChevronDown
                        aria-hidden
                        className={cn("h-4 w-4 shrink-0 text-zinc-500 transition-transform", !open && "-rotate-90")}
                      />
                    </button>
                  </td>
                </tr>
                {open ? <RoomRows rooms={section.rooms} cell={cell} compact={compact} /> : null}
              </tbody>
            );
          })
        ) : (
          <tbody>
            <RoomRows rooms={unit.roomBreakdown} cell={cell} compact={compact} />
          </tbody>
        )}
      </table>
    </div>
  );
}
