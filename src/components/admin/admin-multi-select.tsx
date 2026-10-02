"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";


export type AdminSelectOption = { value: string; label: string };

type PanelPos = { top: number; left: number; width: number };

export function AdminMultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "All",
}: {
  label?: string;
  options: AdminSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const updatePosition = useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPanelPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 200),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      const panel = document.getElementById(listId);
      if (panel?.contains(t)) return;
      setOpen(false);
      setQuery("");
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [listId]);

  const selectedLabels = options.filter((o) => value.includes(o.value)).map((o) => o.label);

  const summary =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join(", ")
        : `${selectedLabels.length} selected`;

  function toggle(v: string) {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  }

  const panel =
    open &&
    panelPos &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        id={listId}
        role="listbox"
        className="overflow-hidden rounded-2xl border border-white/80 bg-clay-surface shadow-clay"
        style={{
          position: "fixed",
          top: panelPos.top,
          left: panelPos.left,
          width: panelPos.width,
          zIndex: 9999,
        }}
      >
        <div className="border-b border-zinc-100 p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-md border border-zinc-200 py-1.5 pl-8 pr-2 text-sm focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-200"
            />
          </div>
        </div>
        <div className="max-h-56 overflow-y-auto py-1">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-400">No options</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-400">No matches</p>
          ) : (
            filtered.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-clay-well"
              >
                <input
                  type="checkbox"
                  checked={value.includes(o.value)}
                  onChange={() => toggle(o.value)}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
                />
                <span className="truncate text-zinc-800">{o.label}</span>
              </label>
            ))
          )}
        </div>
      </div>,
      document.body
    );

  return (
    <div ref={rootRef} className="relative min-w-0 text-sm">
      {label ? <span className="mb-1 block font-medium text-zinc-700">{label}</span> : null}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-transparent bg-clay-well px-3.5 py-2 text-left shadow-clay-inset text-sm hover:border-zinc-300 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-200",
          selectedLabels.length === 0 ? "text-zinc-400" : "text-zinc-800"
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate">{summary}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-zinc-400 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {panel}
    </div>
  );
}
