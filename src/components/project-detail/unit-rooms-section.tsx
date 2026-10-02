"use client";
import { LoadingState } from "@/components/ui/loading-state";

import { useEffect, useState } from "react";
import type { ProjectUnit } from "@/types/project-detail";
import { RoomTypeIcon } from "@/lib/room-type-icon";

export function UnitRoomsSection({
  projectId,
  units: initialUnits,
}: {
  projectId: number;
  units: ProjectUnit[];
}) {
  const [units, setUnits] = useState(initialUnits);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialUnits[0]?.id ?? null
  );
  const [loading, setLoading] = useState(false);
  const hasServerRooms = initialUnits.some((u) => u.roomBreakdown.length > 0);

  const selected = units.find((u) => u.id === selectedId) ?? units[0];
  const rooms = selected?.roomBreakdown ?? [];

  useEffect(() => {
    if (hasServerRooms) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/units?project_id=${projectId}`);
        if (!res.ok) return;
        const raw = (await res.json()) as Array<{ id: number }>;
        const enriched: ProjectUnit[] = [];
        for (const row of raw) {
          const uRes = await fetch("/api/v1/unit-types", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: row.id }),
          });
          if (uRes.ok) {
            const u = (await uRes.json()) as ProjectUnit;
            if (u?.id) enriched.push(u);
          }
        }
        if (!cancelled && enriched.length) {
          setUnits(enriched);
          setSelectedId(enriched[0]?.id ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, hasServerRooms]);

  if (!units.length) return null;
  if (!rooms.length && !loading) {
    const anyRooms = units.some((u) => u.roomBreakdown.length > 0);
    if (!anyRooms) return null;
  }

  return (
    <section className="rounded-clay-lg border border-white/80 bg-clay-surface shadow-clay p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-zinc-900">Unit room allocation</h2>
        {units.length > 1 && (
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            aria-label="Select unit"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.title ?? `Unit #${u.id}`}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading && (
        <LoadingState size="sm" label="Loading room details…" />
      )}

      {!loading && rooms.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-100 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Room</th>
                <th className="px-3 py-2">Count</th>
                <th className="px-3 py-2">Dimensions</th>
                <th className="px-3 py-2">Area (sq.ft)</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r, i) => (
                <tr key={i} className="border-b border-zinc-50 last:border-0">
                  <td className="px-3 py-2 font-medium text-zinc-900">
                    <RoomTypeIcon icon={r.icon} className="mr-2 text-zinc-600" />
                    {r.roomTypeName}
                  </td>
                  <td className="px-3 py-2 text-zinc-600">{r.count ?? "—"}</td>
                  <td className="px-3 py-2 text-zinc-600">{r.dimensions ?? "—"}</td>
                  <td className="px-3 py-2 text-zinc-600">
                    {r.coveredArea != null ? r.coveredArea : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
