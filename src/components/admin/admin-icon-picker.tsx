"use client";

import "@/styles/font-awesome-local.css";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminInputClass } from "@/components/admin/admin-ui";
import { RoomTypeIcon } from "@/lib/room-type-icon";

import faIcons from "@/data/font-awesome-4-icons.json";

export type FaIconOption = { class: string; unicode: string; name: string };

const ALL_ICONS = faIcons as FaIconOption[];

export function AdminIconPicker({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (iconClass: string) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_ICONS;
    return ALL_ICONS.filter(
      (i) => i.name.toLowerCase().includes(q) || i.class.toLowerCase().includes(q)
    );
  }, [query]);

  const selected = ALL_ICONS.find((i) => i.class === value);

  return (
    <label className="block text-sm">
      <span className="font-medium text-zinc-700">
        {label}
        {required && <span className="text-zinc-500"> *</span>}
      </span>
      <div ref={rootRef} className="relative mt-1">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-sm hover:border-zinc-300 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-200",
            !value ? "text-zinc-400" : "text-zinc-800"
          )}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            {selected ? (
              <>
                <RoomTypeIcon icon={selected.class} className="text-base" />
                {selected.name}
              </>
            ) : (
              "Select icon…"
            )}
          </span>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-zinc-400 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
        {open && (
          <div
            id={listId}
            className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-200 bg-white shadow-lg"
          >
            <div className="border-b border-zinc-100 p-2">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search icons…"
                className={cn(adminInputClass, "mt-0")}
                autoFocus
              />
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              <li>
                <button
                  type="button"
                  className="flex w-full px-3 py-2 text-left text-sm text-zinc-500 hover:bg-zinc-50"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                >
                  None
                </button>
              </li>
              {filtered.map((icon) => (
                <li key={icon.class}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-zinc-50",
                      value === icon.class && "bg-zinc-100"
                    )}
                    onClick={() => {
                      onChange(icon.class);
                      setOpen(false);
                    }}
                  >
                    <RoomTypeIcon icon={icon.class} className="text-base" />
                    <span className="truncate">{icon.name}</span>
                  </button>
                </li>
              ))}
              {!filtered.length && (
                <li className="px-3 py-4 text-center text-xs text-zinc-400">No icons match</li>
              )}
            </ul>
          </div>
        )}
      </div>
      <span className="mt-1 block text-xs text-zinc-400">
        Pick an icon from the shared Font Awesome 4 set.
      </span>
    </label>
  );
}
