"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function AmountRangePanel({
  title,
  currency,
  minValue,
  maxValue,
  minPlaceholder = "Min",
  maxPlaceholder = "Max",
  onApply,
}: {
  title: string;
  currency: string;
  minValue: string;
  maxValue: string;
  minPlaceholder?: string;
  maxPlaceholder?: string;
  onApply: (min: string | null, max: string | null) => void;
}) {
  const [min, setMin] = useState(minValue);
  const [max, setMax] = useState(maxValue);

  useEffect(() => {
    setMin(minValue);
    setMax(maxValue);
  }, [minValue, maxValue]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">
          {title} ({currency})
        </h3>
        <button
          type="button"
          onClick={() => {
            setMin("");
            setMax("");
            onApply(null, null);
          }}
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"
        >
          Reset
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-300">
            <X className="h-3 w-3" />
          </span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Min</label>
          <input
            type="number"
            min={0}
            value={min}
            onChange={(e) => setMin(e.target.value)}
            placeholder={minPlaceholder}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Max</label>
          <input
            type="number"
            min={0}
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder={maxPlaceholder}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => onApply(min || null, max || null)}
        className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white"
      >
        Done
      </button>
    </div>
  );
}
