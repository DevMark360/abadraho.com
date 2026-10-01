"use client";

import { Lightbulb } from "lucide-react";
import { useFilterParams } from "@/components/projects/filters/use-filter-params";
import type { FilterAdjustHint } from "@/lib/filter-match-tiers";
import { formatPrice } from "@/lib/utils";

export function FilterTierAdjustButton({
  hint,
  suggestedValue,
  currency = "PKR",
}: {
  hint: { param: string; label: string };
  suggestedValue: number | null;
  currency?: string;
}) {
  const { setOne } = useFilterParams();

  if (suggestedValue == null) return null;

  const actionLabel = `${hint.label} to ${formatPrice(suggestedValue, currency)}`;

  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-3">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
          Helpful tip
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-sky-900">
          Widen your search to discover more projects that almost fit your budget.
        </p>
        <button
          type="button"
          onClick={() => setOne(hint.param, String(Math.ceil(suggestedValue)))}
          className="mt-2 inline-flex rounded-lg border border-sky-300 bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 shadow-sm transition-colors hover:border-sky-400 hover:bg-sky-100"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
