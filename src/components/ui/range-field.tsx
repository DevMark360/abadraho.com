"use client";

import { cn } from "@/lib/utils";

interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  formatValue?: (n: number) => string;
  className?: string;
}

export function RangeField({
  label,
  value,
  min,
  max,
  onChange,
  formatValue = (n) => String(n),
  className,
}: RangeFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-zinc-700">{label}</span>
        <span className="tabular-nums text-zinc-500">{formatValue(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-zinc-900"
      />
    </div>
  );
}
