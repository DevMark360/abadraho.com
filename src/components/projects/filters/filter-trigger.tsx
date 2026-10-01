"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function FilterTrigger({
  label,
  active,
  onClick,
  className,
  icon,
  showChevron = true,
  count,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  className?: string;
  icon?: React.ReactNode;
  showChevron?: boolean;
  /** Number of applied values (e.g. 2 areas selected) */
  count?: number;
}) {
  const showCount = count != null && count > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium shadow-sm transition-all min-h-[44px]",
        active
          ? "border-zinc-800 bg-zinc-900 text-white shadow-zinc-900/10 hover:bg-zinc-800"
          : "border-zinc-200/90 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50",
        className
      )}
    >
      {icon}
      <span>{label}</span>
      {showCount && (
        <span
          className={cn(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[10px] font-bold leading-none",
            active ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-700"
          )}
        >
          {count}
        </span>
      )}
      {showChevron && (
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 opacity-80",
            active ? "text-white" : "text-zinc-400"
          )}
        />
      )}
    </button>
  );
}
