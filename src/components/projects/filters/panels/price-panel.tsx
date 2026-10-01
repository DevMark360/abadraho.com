"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

/** PKR-friendly quick picks (Pakistan off-plan market) */
const QUICK_MIN = [5_000_000, 10_000_000, 15_000_000, 20_000_000, 30_000_000];
const QUICK_MAX = [20_000_000, 40_000_000, 60_000_000, 80_000_000, 100_000_000];

function formatAmount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return n.toLocaleString("en-PK");
}

export function PricePanel({
  currency,
  minPrice,
  maxPrice,
  onApply,
}: {
  currency: string;
  minPrice: string;
  maxPrice: string;
  onApply: (min: string | null, max: string | null) => void;
}) {
  const [min, setMin] = useState(minPrice);
  const [max, setMax] = useState(maxPrice);

  useEffect(() => {
    setMin(minPrice);
    setMax(maxPrice);
  }, [minPrice, maxPrice]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">Price range ({currency})</h3>
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
          <label className="mb-1 block text-xs font-medium text-zinc-600">Min price</label>
          <input
            type="number"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            placeholder="e.g. 5000000"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          <div className="mt-2 flex flex-wrap gap-1">
            {QUICK_MIN.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setMin(String(p))}
                className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700 hover:bg-zinc-200"
              >
                {formatAmount(p)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-600">Max price</label>
          <input
            type="number"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder="e.g. 50000000"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          <div className="mt-2 flex flex-wrap gap-1">
            {QUICK_MAX.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setMax(String(p))}
                className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700 hover:bg-zinc-200"
              >
                {formatAmount(p)}
              </button>
            ))}
          </div>
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
