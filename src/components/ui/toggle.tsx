"use client";

import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  className?: string;
}

/** Reelly-style switch toggle */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  className,
}: ToggleProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-3 py-2",
        className
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-zinc-800">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-zinc-500">{description}</span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-zinc-900" : "bg-zinc-300"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5"
          )}
        />
      </button>
    </label>
  );
}
