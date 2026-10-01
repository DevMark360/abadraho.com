"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ChipPanel({
  options,
  selected,
  multi = true,
  emptyLabel = "No options available",
  onApply,
}: {
  options: { value: string; label: string; dot?: string }[];
  selected: string[];
  multi?: boolean;
  emptyLabel?: string;
  onApply: (values: string[]) => void;
}) {
  const [local, setLocal] = useState(selected);

  useEffect(() => {
    setLocal(selected);
  }, [selected]);

  const toggle = (value: string) => {
    if (multi) {
      setLocal((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
      );
    } else {
      setLocal((prev) => (prev.includes(value) ? [] : [value]));
    }
  };

  if (!options.length) {
    return <p className="text-sm text-zinc-500">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = local.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-zinc-200 text-zinc-900 ring-1 ring-zinc-300"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200/80"
              )}
            >
              {opt.dot && (
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: opt.dot }}
                />
              )}
              {opt.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onApply(local)}
        className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white"
      >
        Done
      </button>
    </div>
  );
}
