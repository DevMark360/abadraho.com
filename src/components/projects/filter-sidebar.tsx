"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { cn } from "@/lib/utils";
import { SegmentControl } from "@/components/ui/segment-control";
import { Toggle } from "@/components/ui/toggle";
import { RangeField } from "@/components/ui/range-field";
import type { AreaUnit, PricePer } from "@/types/project";
import { FilterPromoCards } from "@/components/projects/filter-promo-cards";
import { HousingCalculator } from "@/components/projects/housing-calculator";

interface FilterSidebarProps {
  areas?: { id: number; name: string }[];
  className?: string;
}

export function FilterSidebar({ areas = [], className }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const update = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
      startTransition(() => {
        router.push(`/projects?${params.toString()}`, { scroll: false });
      });
    },
    [router, searchParams]
  );

  const bool = (key: string) => searchParams.get(key) === "true";
  const num = (key: string, fallback: number) =>
    Number(searchParams.get(key) ?? fallback);

  const pricePer = (searchParams.get("pricePer") as PricePer) || "unit";
  const areaUnit = (searchParams.get("preferredAreaUnit") as AreaUnit) || "sqft";

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-white",
        className
      )}
    >
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5 lg:px-5">
        {isPending && (
          <p className="text-xs text-zinc-400">Updating filters…</p>
        )}

        <div>
          <p className="mb-2 text-xs font-medium text-zinc-500">Price per</p>
          <SegmentControl
            size="sm"
            options={[
              { value: "unit", label: "Unit" },
              { value: "sqft", label: "Sqft" },
            ]}
            value={pricePer}
            onChange={(v) => update("pricePer", v)}
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-zinc-500">Preferred area unit</p>
          <SegmentControl
            size="sm"
            options={[
              { value: "sqft", label: "sqft" },
              { value: "sqm", label: "sqm" },
            ]}
            value={areaUnit}
            onChange={(v) => update("preferredAreaUnit", v)}
          />
        </div>

        <div className="space-y-0 divide-y divide-zinc-100">
          <Toggle
            label="With deal bonus"
            checked={bool("withDealBonus")}
            onChange={(c) => update("withDealBonus", c ? "true" : null)}
          />
          <Toggle
            label="Handover only"
            checked={bool("handoverOnly")}
            onChange={(c) => update("handoverOnly", c ? "true" : null)}
          />
          <Toggle
            label="Only post-handover"
            checked={bool("onlyPostHandover")}
            onChange={(c) => update("onlyPostHandover", c ? "true" : null)}
          />
          <Toggle
            label="Has resale"
            checked={bool("hasResale")}
            onChange={(c) => update("hasResale", c ? "true" : null)}
          />
        </div>

        <RangeField
          label="Handover within (months)"
          min={1}
          max={60}
          value={num("handoverMonths", 1)}
          onChange={(v) => update("handoverMonths", String(v))}
          formatValue={(n) => `${n} mo`}
        />

        <RangeField
          label="Post-handover min %"
          min={0}
          max={100}
          value={num("postHandoverMin", 10)}
          onChange={(v) => update("postHandoverMin", String(v))}
          formatValue={(n) => `${n}%`}
        />

        <RangeField
          label="Pre-handover max %"
          min={0}
          max={100}
          value={num("preHandoverMax", 100)}
          onChange={(v) => update("preHandoverMax", String(v))}
          formatValue={(n) => `${n}%`}
        />

        {areas.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500">Areas</p>
            <div className="max-h-36 space-y-1 overflow-y-auto">
              {areas.map((a) => (
                <label
                  key={a.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  <input
                    type="checkbox"
                    className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                  />
                  {a.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => startTransition(() => router.push("/"))}
          className="w-full rounded-lg border border-zinc-200 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Reset all filters
        </button>
      </div>

      <div className="px-4 pb-4">
        <HousingCalculator />
      </div>
      <FilterPromoCards />
    </aside>
  );
}
