"use client";

import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentControlProps<T extends string> {
  options: readonly SegmentOption<T>[] | SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}

/** Reelly-style pill segment control */
export function SegmentControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: SegmentControlProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex w-full rounded-lg bg-zinc-100 p-1",
        className
      )}
      role="tablist"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 rounded-md font-medium transition-all",
            size === "sm" ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
            value === opt.value
              ? "bg-zinc-900 text-white shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
