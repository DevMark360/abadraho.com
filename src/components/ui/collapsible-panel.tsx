"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Hydration-safe collapsible — content stays in the DOM via `hidden` (GEO-friendly). */
export function CollapsiblePanel({
  label,
  hint,
  children,
  defaultOpen = false,
  className,
  labelClassName,
  bodyClassName,
}: {
  label: ReactNode;
  hint?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  labelClassName?: string;
  bodyClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className={cn("rounded-lg border border-zinc-200/80 bg-white", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex w-full items-center justify-between gap-2 px-4 py-3 text-left font-medium text-zinc-900",
          labelClassName
        )}
      >
        <span className="min-w-0 flex-1">{label}</span>
        {hint && !open ? (
          <span className="shrink-0 text-xs font-normal text-zinc-400">{hint}</span>
        ) : null}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-zinc-400 transition-transform",
            open && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      <div id={panelId} hidden={!open} className={cn("border-t border-zinc-100", bodyClassName)}>
        {children}
      </div>
    </div>
  );
}
