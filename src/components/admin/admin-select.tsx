"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import { inputFieldClass, inputInlineClass } from "@/lib/form-styles";
import { cn } from "@/lib/utils";

export type AdminSelectOption = { value: string; label: string };

type PanelPos = { top: number; left: number; width: number };

export type AdminSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: AdminSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  layout?: "field" | "inline";
  className?: string;
  id?: string;
  name?: string;
  "aria-label"?: string;
};

export function AdminSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled,
  required,
  layout = "field",
  className,
  id,
  name,
  "aria-label": ariaLabel,
}: AdminSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [panelPos, setPanelPos] = useState<PanelPos | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);
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
      width: Math.max(rect.width, 220),
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

  function pick(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  const panel =
    open &&
    panelPos &&
    !disabled &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        id={listId}
        role="listbox"
        className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl"
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
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-400">No matches</p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => pick(o.value)}
                className={cn(
                  "flex w-full px-3 py-2 text-left text-sm hover:bg-zinc-50",
                  o.value === value ? "bg-zinc-100 font-medium text-zinc-900" : "text-zinc-800"
                )}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      </div>,
      document.body
    );

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden
          name={name}
          value={value}
          required
          onChange={() => undefined}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      ) : null}
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((o) => !o);
        }}
        className={cn(
          layout === "field" ? inputFieldClass : inputInlineClass,
          "flex items-center justify-between gap-2 text-left",
          disabled && "cursor-not-allowed opacity-60",
          !selected?.label && "text-zinc-400"
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
      >
        <span className="truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-zinc-400 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {panel}
    </div>
  );
}
