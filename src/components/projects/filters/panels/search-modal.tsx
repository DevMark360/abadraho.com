"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Search, ListFilter, Heart } from "lucide-react";
import { ChipPanel } from "@/components/projects/filters/panels/chip-panel";

type FilterOption = { value: string; label: string };

export function SearchModal({
  open,
  onClose,
  resultCount,
  query,
  areaIds,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  resultCount: number;
  query: string;
  areaIds: string;
  onApply: (data: { q: string | null; area: string | null }) => void;
}) {
  const [q, setQ] = useState(query);
  const [areas, setAreas] = useState<FilterOption[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>(
    areaIds ? areaIds.split(",").filter(Boolean) : []
  );

  useEffect(() => {
    if (!open) return;
    setQ(query);
    setSelectedAreas(areaIds ? areaIds.split(",").filter(Boolean) : []);
    fetch("/api/v1/meta/filters")
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json.areas)) setAreas(json.areas);
      })
      .catch(() => {});
  }, [open, query, areaIds]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-12 sm:pt-20">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 pb-4">
          <h2 className="text-xl font-semibold text-zinc-900">
            Search projects{" "}
            <span className="font-semibold text-indigo-600">
              {resultCount.toLocaleString()}
            </span>
          </h2>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Project name, developer, or address"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
            />
          </div>

          {areas.length > 0 && (
            <section className="mt-6">
              <h3 className="text-sm font-semibold text-zinc-900">Area</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Filter by location from your project database
              </p>
              <div className="mt-3">
                <ChipPanel
                  options={areas}
                  selected={selectedAreas}
                  emptyLabel="No areas in database"
                  onApply={(vals) => setSelectedAreas(vals)}
                />
              </div>
            </section>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-zinc-100 p-4">
          <Link
            href="/account/wishlist"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
          >
            <Heart className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={() => {
              onApply({
                q: q.trim() || null,
                area: selectedAreas.length ? selectedAreas.join(",") : null,
              });
              onClose();
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <ListFilter className="h-4 w-4" />
            Show {resultCount.toLocaleString()} projects
          </button>
        </div>
      </div>
    </div>
  );
}
