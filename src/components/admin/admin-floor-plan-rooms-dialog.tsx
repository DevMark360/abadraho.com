"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Plus, RefreshCw, RotateCcw, X } from "lucide-react";
import { AdminSelect } from "@/components/admin/admin-select";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { matchRoomType, type RoomSuggestion } from "@/lib/floor-plan-rooms";
import { cn } from "@/lib/utils";

type RoomType = { id: number; name: string };

type Row = {
  key: number;
  include: boolean;
  label: string | null;
  roomTypeId: string;
  widthFeet: string;
  widthInches: string;
  lengthFeet: string;
  lengthInches: string;
  qty: string;
};

type Phase = "reading" | "review" | "saving" | "error";

let nextKey = 1;

function toRow(s: RoomSuggestion): Row {
  return {
    key: nextKey++,
    include: true,
    label: s.label,
    roomTypeId: s.roomTypeId ? String(s.roomTypeId) : "",
    widthFeet: s.width ? String(s.width.feet) : "",
    widthInches: s.width ? String(s.width.inches) : "0",
    lengthFeet: s.length ? String(s.length.feet) : "",
    lengthInches: s.length ? String(s.length.inches) : "0",
    qty: String(s.qty),
  };
}

const blankRow = (): Row => ({
  key: nextKey++,
  include: true,
  label: null,
  roomTypeId: "",
  widthFeet: "",
  widthInches: "0",
  lengthFeet: "",
  lengthInches: "0",
  qty: "1",
});

const whole = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value) : NaN);

function rowArea(r: Row): number | null {
  const w = whole(r.widthFeet) + whole(r.widthInches || "0") / 12;
  const l = whole(r.lengthFeet) + whole(r.lengthInches || "0") / 12;
  const qty = whole(r.qty) || 1;
  const area = w * l * qty;
  return Number.isFinite(area) && area > 0 ? Math.round(area * 100) / 100 : null;
}

const ROOM_TYPES_HREF = "/admin/room-types";

/** Read off the plan but not one of the saved room types yet. */
const isUnknownType = (r: Row) => !r.roomTypeId && Boolean(r.label);

function rowProblem(r: Row): string | null {
  if (isUnknownType(r)) return "Not in Room Types yet";
  if (!r.roomTypeId) return "Pick a room type";
  if (whole(r.widthInches || "0") > 11 || whole(r.lengthInches || "0") > 11) return "Inches must be 0–11";
  if (rowArea(r) == null) return "Enter the size";
  if (!(whole(r.qty) >= 1)) return "Quantity must be 1 or more";
  return null;
}

function SizeInput({
  value,
  onChange,
  label,
  max,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  max?: number;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={max}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-14 rounded-lg border border-transparent bg-clay-well px-2 text-sm tabular-nums shadow-clay-inset focus:border-zinc-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent/15"
    />
  );
}

/** Reads rooms off the floor plan, lets the admin correct them, then adds them in one request. */
export function AdminFloorPlanRoomsDialog({
  unitId,
  floorPlanFile,
  floorPlanUrl,
  roomTypes: initialRoomTypes,
  onClose,
  onAdded,
  onRoomTypesChange,
  groupId = null,
}: {
  unitId: number;
  /** Room group the added rooms go into (units with more than one layout / floor). */
  groupId?: number | null;
  floorPlanFile: File | null;
  floorPlanUrl: string | null;
  roomTypes: RoomType[];
  onClose: () => void;
  onAdded: (count: number) => void;
  onRoomTypesChange?: (roomTypes: RoomType[]) => void;
}) {
  const [phase, setPhase] = useState<Phase>("reading");
  const [rows, setRows] = useState<Row[]>([]);
  const [message, setMessage] = useState("");
  const [roomTypes, setRoomTypes] = useState(initialRoomTypes);
  const [refreshing, setRefreshing] = useState(false);

  const previewUrl = useMemo(
    () => (floorPlanFile ? URL.createObjectURL(floorPlanFile) : floorPlanUrl),
    [floorPlanFile, floorPlanUrl]
  );
  useEffect(
    () => () => {
      if (floorPlanFile && previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [floorPlanFile, previewUrl]
  );

  const read = useCallback(async () => {
    setPhase("reading");
    setMessage("");
    const body = new FormData();
    if (floorPlanFile) body.append("file", floorPlanFile);
    try {
      const res = await fetch(`/api/admin/units/${unitId}/floor-plan-rooms`, { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        rooms?: RoomSuggestion[];
      };
      if (!json.success || !json.rooms) throw new Error(json.message ?? "Could not read the floor plan");
      setRows(json.rooms.map(toRow));
      setPhase("review");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not read the floor plan");
      setPhase("error");
    }
  }, [unitId, floorPlanFile]);

  // One read per open: each call spends the Groq per-minute allowance (and dev mounts twice).
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void read();
  }, [read]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && phase !== "saving" && onClose();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, phase]);

  /** Picks up room types added in another tab and matches the rows that were unknown. */
  const refreshRoomTypes = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/units/meta");
      const json = (await res.json().catch(() => ({}))) as { roomTypes?: RoomType[] };
      if (!Array.isArray(json.roomTypes)) return;
      const latest = json.roomTypes;
      setRoomTypes(latest);
      onRoomTypesChange?.(latest);
      setRows((list) =>
        list.map((r) => {
          if (!isUnknownType(r)) return r;
          const id = matchRoomType(r.label!, latest);
          return id ? { ...r, roomTypeId: String(id) } : r;
        })
      );
    } finally {
      setRefreshing(false);
    }
  }, [onRoomTypesChange]);

  const unknownCount = rows.filter((r) => r.include && isUnknownType(r)).length;

  useEffect(() => {
    if (phase !== "review" || !unknownCount) return;
    const onReturn = () => document.visibilityState === "visible" && void refreshRoomTypes();
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [phase, unknownCount, refreshRoomTypes]);

  const update = (key: number, patch: Partial<Row>) =>
    setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const selected = rows.filter((r) => r.include);
  const problems = selected.filter((r) => rowProblem(r) != null).length;
  const roomOptions = useMemo(
    () => roomTypes.map((rt) => ({ value: String(rt.id), label: rt.name })),
    [roomTypes]
  );

  async function save() {
    setPhase("saving");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/units/${unitId}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          rooms: selected.map((r) => ({
            roomTypeId: Number(r.roomTypeId),
            widthFeet: whole(r.widthFeet),
            widthInches: whole(r.widthInches || "0"),
            lengthFeet: whole(r.lengthFeet),
            lengthInches: whole(r.lengthInches || "0"),
            extras: String(whole(r.qty)),
          })),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string; count?: number };
      if (!json.success) throw new Error(json.message ?? "Could not add the rooms");
      onAdded(json.count ?? selected.length);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not add the rooms");
      setPhase("review");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="floor-plan-rooms-title"
      onMouseDown={(e) => e.target === e.currentTarget && phase !== "saving" && onClose()}
    >
      <div className="flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl bg-clay-surface shadow-clay sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <h2 id="floor-plan-rooms-title" className="text-lg font-semibold text-zinc-900">
              Rooms from floor plan
            </h2>
            <p className="text-sm text-zinc-500">
              Check each row against the plan, fix anything misread, then add.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={phase === "saving"}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-clay-well disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:overflow-hidden">
          <div className="border-b border-zinc-200 bg-white p-3 lg:overflow-y-auto lg:border-b-0 lg:border-r">
            {previewUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob or upload preview */}
                <img src={previewUrl} alt="Floor plan" className="mx-auto max-h-[40dvh] w-auto object-contain lg:max-h-none" />
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-brand-accent"
                >
                  Open full size
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </>
            ) : null}
          </div>

          <div className="min-w-0 p-3 sm:p-4 lg:overflow-y-auto">
            {phase === "reading" ? (
              <LoadingState size="sm" label="Reading the floor plan…" className="py-16" />
            ) : phase === "error" ? (
              <div className="space-y-3 py-10 text-center">
                <p className="text-sm text-red-700">{message}</p>
                <Button type="button" variant="outline" className="gap-1.5" onClick={() => void read()}>
                  <RotateCcw className="h-4 w-4" />
                  Try again
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      <th className="w-8 pb-2" aria-label="Include" />
                      <th className="pb-2">Room type</th>
                      <th className="pb-2">Width ft / in</th>
                      <th className="pb-2">Length ft / in</th>
                      <th className="pb-2">Qty</th>
                      <th className="pb-2 text-right">Area</th>
                      <th className="w-8 pb-2" aria-label="Remove" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const problem = r.include ? rowProblem(r) : null;
                      const area = rowArea(r);
                      return (
                        <tr
                          key={r.key}
                          className={cn("border-t border-zinc-100 align-top", !r.include && "opacity-45")}
                        >
                          <td className="py-2 pr-2 pt-4">
                            <input
                              type="checkbox"
                              checked={r.include}
                              onChange={(e) => update(r.key, { include: e.target.checked })}
                              aria-label="Include this room"
                              className="h-4 w-4 accent-zinc-900"
                            />
                          </td>
                          <td className="min-w-[200px] py-2 pr-3">
                            {isUnknownType(r) ? (
                              <div className="mb-1.5 rounded-xl border-2 border-amber-400 bg-amber-50 px-3 py-1.5">
                                <p className="truncate text-sm font-semibold text-zinc-900" title={r.label!}>
                                  {r.label}
                                </p>
                                <p className="text-xs text-amber-800">
                                  Not in Room Types yet.{" "}
                                  <a
                                    href={ROOM_TYPES_HREF}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-0.5 font-semibold underline underline-offset-2 hover:text-brand-accent"
                                  >
                                    Add it
                                    <ExternalLink className="h-3 w-3" aria-hidden />
                                  </a>
                                </p>
                              </div>
                            ) : null}
                            <AdminSelect
                              layout="inline"
                              value={r.roomTypeId}
                              onChange={(value) => update(r.key, { roomTypeId: value })}
                              placeholder={isUnknownType(r) ? "or pick an existing type" : "Room type"}
                              options={roomOptions}
                              className={cn(problem === "Pick a room type" && "rounded-xl ring-2 ring-red-300")}
                            />
                            {r.label && !isUnknownType(r) ? (
                              <p className="mt-1 truncate text-xs text-zinc-500" title={r.label}>
                                Read as “{r.label}”
                              </p>
                            ) : null}
                            {problem && !isUnknownType(r) ? (
                              <p className="mt-0.5 text-xs text-red-600">{problem}</p>
                            ) : null}
                          </td>
                          <td className="py-2 pr-3">
                            <div className="flex items-center gap-1">
                              <SizeInput label="Width feet" value={r.widthFeet} onChange={(v) => update(r.key, { widthFeet: v })} />
                              <SizeInput label="Width inches" max={11} value={r.widthInches} onChange={(v) => update(r.key, { widthInches: v })} />
                            </div>
                          </td>
                          <td className="py-2 pr-3">
                            <div className="flex items-center gap-1">
                              <SizeInput label="Length feet" value={r.lengthFeet} onChange={(v) => update(r.key, { lengthFeet: v })} />
                              <SizeInput label="Length inches" max={11} value={r.lengthInches} onChange={(v) => update(r.key, { lengthInches: v })} />
                            </div>
                          </td>
                          <td className="py-2 pr-3">
                            <SizeInput label="Quantity" value={r.qty} onChange={(v) => update(r.key, { qty: v })} />
                          </td>
                          <td className="whitespace-nowrap py-2 pt-4 text-right tabular-nums text-zinc-700">
                            {area != null ? `${area} sq ft` : "—"}
                          </td>
                          <td className="py-2 pl-2 pt-3">
                            <button
                              type="button"
                              onClick={() => setRows((list) => list.filter((x) => x.key !== r.key))}
                              className="rounded-lg p-1 text-zinc-400 hover:bg-clay-well hover:text-red-600"
                              aria-label="Remove row"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 gap-1.5"
                  onClick={() => setRows((list) => [...list, blankRow()])}
                >
                  <Plus className="h-4 w-4" />
                  Add a missed room
                </Button>
              </div>
            )}
          </div>
        </div>

        {phase === "review" || phase === "saving" ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 sm:px-6">
            <p
              className={cn(
                "text-sm",
                message || problems > unknownCount ? "text-red-600" : unknownCount ? "text-amber-800" : "text-zinc-500"
              )}
            >
              {message ||
                (unknownCount
                  ? `${unknownCount} room ${unknownCount === 1 ? "type is" : "types are"} not in Room Types yet. Add ${unknownCount === 1 ? "it" : "them"} in the other tab, then come back.`
                  : problems
                    ? `${problems} selected ${problems === 1 ? "row needs" : "rows need"} fixing`
                    : `${selected.length} ${selected.length === 1 ? "room" : "rooms"} selected`)}
            </p>
            <div className="flex flex-wrap gap-2">
              {unknownCount ? (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => void refreshRoomTypes()}
                  disabled={refreshing || phase === "saving"}
                >
                  <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                  Refresh room types
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => void read()} disabled={phase === "saving"}>
                Read again
              </Button>
              <Button
                type="button"
                onClick={() => void save()}
                disabled={phase === "saving" || !selected.length || problems > 0}
              >
                {phase === "saving"
                  ? "Adding…"
                  : `Add ${selected.length} ${selected.length === 1 ? "room" : "rooms"}`}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
