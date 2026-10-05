"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, useEffect, useTransition } from "react";
import { Calculator, Heart, LayoutGrid, Map, Search } from "lucide-react";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useAuth } from "@/components/auth/auth-provider";
import { useFilterDraft } from "@/components/projects/filters/use-filter-draft";
import { trackFilterSearch } from "@/lib/client/search-history-track";
import { FilterTrigger } from "@/components/projects/filters/filter-trigger";
import { FilterDropdown } from "@/components/projects/filters/filter-dropdown";
import { PricePanel } from "@/components/projects/filters/panels/price-panel";
import { AmountRangePanel } from "@/components/projects/filters/panels/amount-range-panel";
import { ChipPanel } from "@/components/projects/filters/panels/chip-panel";
import { HousingBudgetCalculatorModal } from "@/components/projects/filters/panels/housing-budget-calculator-modal";
import { clearHousingBudgetUrlParams } from "@/lib/housing-budget";

const BEDROOMS = [
  { value: "studio", label: "Studio" },
  { value: "1", label: "1 BR" },
  { value: "2", label: "2 BR" },
  { value: "3", label: "3 BR" },
  { value: "4", label: "4 BR" },
  { value: "5+", label: "5+ BR" },
];

type FilterOption = { value: string; label: string; dot?: string; cityId?: string | null };
type PanelKey =
  | "housingBudget"
  | "city"
  | "area"
  | "developer"
  | "price"
  | "downPayment"
  | "monthlyInstallment"
  | "unitType"
  | "bedrooms"
  | "status"
  | "plan";

export function FilterChipsBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [viewPending, startViewTransition] = useTransition();
  const view = searchParams.get("view") ?? "list";

  const {
    draft,
    draftGet,
    parseDraftList,
    draftSetOne,
    draftSetMany,
    applyDraft,
    applyDraftUpdates,
    clearDraft,
    hasDraftChanges,
    hasAppliedFilters,
    pending,
    searchParams: filterSearchParams,
    setOne,
  } = useFilterDraft();

  function onSearchClick() {
    trackFilterSearch(draft, areas, Boolean(user));
    applyDraft();
  }

  const [open, setOpen] = useState<PanelKey | null>(null);
  const cityRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const developerRef = useRef<HTMLDivElement>(null);
  const priceRef = useRef<HTMLDivElement>(null);
  const downPaymentRef = useRef<HTMLDivElement>(null);
  const monthlyInstallmentRef = useRef<HTMLDivElement>(null);
  const unitTypeRef = useRef<HTMLDivElement>(null);
  const bedroomsRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const planRef = useRef<HTMLDivElement>(null);

  const [developers, setDevelopers] = useState<FilterOption[]>([]);
  const [unitTypes, setUnitTypes] = useState<FilterOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<FilterOption[]>([]);
  const [areas, setAreas] = useState<FilterOption[]>([]);
  const [cities, setCities] = useState<FilterOption[]>([]);
  const [plans, setPlans] = useState<FilterOption[]>([]);
  const appliedQuery = searchParams.get("q") ?? "";
  const [queryInput, setQueryInput] = useState(appliedQuery);
  const debouncedQuery = useDebouncedValue(queryInput, 400);
  // Tracks the value *we* last pushed to the URL, so the sync effect below can tell
  // "the URL caught up with what I typed" (ignore — keep typing intact) apart from
  // "the URL changed for some other reason" (e.g. back/forward, a filter chip reset it).
  // Without this, the URL round-trip echoes back and clobbers keystrokes typed during
  // the debounce/navigation window, cutting off the tail of fast typing.
  const lastPushedQueryRef = useRef(appliedQuery);

  useEffect(() => {
    if (appliedQuery === lastPushedQueryRef.current) return;
    lastPushedQueryRef.current = appliedQuery;
    setQueryInput(appliedQuery);
  }, [appliedQuery]);

  useEffect(() => {
    const next = debouncedQuery.trim();
    const current = appliedQuery.trim();
    if (next === current) return;
    lastPushedQueryRef.current = next;
    setOne("q", next || null);
  }, [debouncedQuery, appliedQuery, setOne]);

  useEffect(() => {
    fetch("/api/v1/meta/filters")
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json.builders)) setDevelopers(json.builders);
        if (Array.isArray(json.unitTypes)) setUnitTypes(json.unitTypes);
        if (Array.isArray(json.statuses)) setStatusOptions(json.statuses);
        if (Array.isArray(json.areas)) setAreas(json.areas);
        if (Array.isArray(json.cities)) setCities(json.cities);
        if (Array.isArray(json.plans)) setPlans(json.plans);
      })
      .catch(() => {});
  }, []);

  const selectedCityIds = parseDraftList("city");
  const visibleAreas = useMemo(
    () =>
      selectedCityIds.length
        ? areas.filter((a) => a.cityId != null && selectedCityIds.includes(a.cityId))
        : areas,
    [areas, selectedCityIds]
  );

  const currency = "PKR";
  const close = () => setOpen(null);
  const calculatorActive = open === "housingBudget" || draftGet("hc") === "1";

  function setViewParam(value: string | null) {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set("view", value);
    else p.delete("view");
    startViewTransition(() => router.push(`/projects?${p.toString()}`, { scroll: false }));
  }

  const calculatorParams = useMemo(() => {
    const merged = new URLSearchParams(filterSearchParams.toString());
    const draftKeys = [
      "area",
      "minPrice",
      "maxPrice",
      "minDownPayment",
      "maxDownPayment",
      "minMonthlyInstallment",
      "maxMonthlyInstallment",
      "hc",
      "hcArea",
      "hcBudget",
      "hcDownPayment",
      "hcMonthly",
      "hcDuration",
      "hcMode",
      "hcSplit",
    ];
    for (const key of draftKeys) {
      const draftVal = draftGet(key);
      if (draftVal) merged.set(key, draftVal);
      else merged.delete(key);
    }
    return merged;
  }, [filterSearchParams, draftGet]);

  return (
    <>
      <div
        className={cn(
          "mx-3 mt-3 rounded-clay-lg border border-white/80 bg-clay-surface shadow-clay sm:mx-4 lg:mx-6",
          (pending || viewPending) && "opacity-90"
        )}
      >
        {/* View controls + Budget Calculator */}
        <div className="filter-chips-bar__controls">
          <button
            type="button"
            onClick={() =>
              setOpen(open === "housingBudget" ? null : "housingBudget")
            }
            className={cn(
              "inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
              calculatorActive
                ? "border-violet-500 bg-violet-600 text-white shadow-sm hover:bg-violet-700"
                : "border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-300 hover:bg-violet-100"
            )}
          >
            <Calculator className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden whitespace-nowrap sm:inline">Budget Calculator</span>
            <span className="whitespace-nowrap sm:hidden">Budget</span>
          </button>

          <div className="flex min-h-[44px] rounded-2xl bg-clay-well p-1 shadow-clay-inset">
            <button
              type="button"
              onClick={() => setViewParam("map")}
              className={cn(
                "flex min-h-[40px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
                view === "map"
                  ? designTw.navActive
                  : "text-zinc-600 hover:text-zinc-900"
              )}
            >
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Map</span>
            </button>
            <button
              type="button"
              onClick={() => setViewParam("list")}
              className={cn(
                "flex min-h-[40px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
                view !== "map"
                  ? designTw.navActive
                  : "text-zinc-600 hover:text-zinc-900"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>

          <Link
            href="/account/wishlist"
            className="flex min-h-[44px] items-center gap-1.5 rounded-2xl border border-white/80 bg-clay-surface px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-clay-sm transition-shadow hover:shadow-clay"
          >
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Saved</span>
          </Link>
        </div>

        {/* Filter pills + actions */}
        <div className="relative">
          <div className="filter-chips-bar__filters-row">
            <div className="filter-chips-bar__pills">
              <div ref={cityRef} className="relative shrink-0">
                <FilterTrigger
                  label="City"
                  active={open === "city" || !!draftGet("city")}
                  count={parseDraftList("city").length || undefined}
                  onClick={() => setOpen(open === "city" ? null : "city")}
                />
                <FilterDropdown open={open === "city"} onClose={close} anchorRef={cityRef} width="md">
                  <ChipPanel
                    options={cities}
                    selected={parseDraftList("city")}
                    emptyLabel="No cities in database"
                    onApply={(vals) => {
                      draftSetOne("city", vals.length ? vals.join(",") : null);
                      // Selected areas that no longer belong to any chosen city would
                      // otherwise keep silently filtering results after the city narrows.
                      const stillValid = parseDraftList("area").filter((areaId) => {
                        const area = areas.find((a) => a.value === areaId);
                        return !vals.length || (area?.cityId != null && vals.includes(area.cityId));
                      });
                      if (stillValid.length !== parseDraftList("area").length) {
                        draftSetOne("area", stillValid.length ? stillValid.join(",") : null);
                      }
                      close();
                    }}
                  />
                </FilterDropdown>
              </div>

              <div ref={areaRef} className="relative shrink-0">
                <FilterTrigger
                  label="Area"
                  active={open === "area" || !!draftGet("area")}
                  count={parseDraftList("area").length || undefined}
                  onClick={() => setOpen(open === "area" ? null : "area")}
                />
                <FilterDropdown open={open === "area"} onClose={close} anchorRef={areaRef} width="lg">
                  <ChipPanel
                    options={visibleAreas}
                    selected={parseDraftList("area")}
                    emptyLabel={
                      selectedCityIds.length ? "No areas in this city yet" : "No areas in database"
                    }
                    onApply={(vals) => {
                      draftSetOne("area", vals.length ? vals.join(",") : null);
                      close();
                    }}
                  />
                </FilterDropdown>
              </div>

              <div ref={developerRef} className="relative shrink-0">
                <FilterTrigger
                  label="Developer"
                  active={open === "developer" || !!draftGet("developer")}
                  count={parseDraftList("developer").length || undefined}
                  onClick={() => setOpen(open === "developer" ? null : "developer")}
                />
                <FilterDropdown
                  open={open === "developer"}
                  onClose={close}
                  anchorRef={developerRef}
                  width="lg"
                >
                  <ChipPanel
                    options={developers}
                    selected={parseDraftList("developer")}
                    emptyLabel="No developers in database"
                    onApply={(vals) => {
                      draftSetOne("developer", vals.length ? vals.join(",") : null);
                      close();
                    }}
                  />
                </FilterDropdown>
              </div>

              <div ref={priceRef} className="relative shrink-0">
                <FilterTrigger
                  label="Price"
                  active={
                    open === "price" || !!draftGet("minPrice") || !!draftGet("maxPrice")
                  }
                  onClick={() => setOpen(open === "price" ? null : "price")}
                />
                <FilterDropdown open={open === "price"} onClose={close} anchorRef={priceRef} width="lg">
                  <PricePanel
                    currency={currency}
                    minPrice={draftGet("minPrice") ?? ""}
                    maxPrice={draftGet("maxPrice") ?? ""}
                    onApply={(min, max) => {
                      draftSetMany({ minPrice: min, maxPrice: max });
                      close();
                    }}
                  />
                </FilterDropdown>
              </div>

              <div ref={downPaymentRef} className="relative shrink-0">
                <FilterTrigger
                  label="Down payment"
                  active={
                    open === "downPayment" ||
                    !!draftGet("minDownPayment") ||
                    !!draftGet("maxDownPayment")
                  }
                  onClick={() => setOpen(open === "downPayment" ? null : "downPayment")}
                />
                <FilterDropdown
                  open={open === "downPayment"}
                  onClose={close}
                  anchorRef={downPaymentRef}
                  width="lg"
                >
                  <AmountRangePanel
                    title="Down payment range"
                    currency={currency}
                    minValue={draftGet("minDownPayment") ?? ""}
                    maxValue={draftGet("maxDownPayment") ?? ""}
                    minPlaceholder="e.g. 500000"
                    maxPlaceholder="e.g. 5000000"
                    onApply={(min, max) => {
                      draftSetMany({ minDownPayment: min, maxDownPayment: max });
                      close();
                    }}
                  />
                </FilterDropdown>
              </div>

              <div ref={monthlyInstallmentRef} className="relative shrink-0">
                <FilterTrigger
                  label="Monthly"
                  active={
                    open === "monthlyInstallment" ||
                    !!draftGet("minMonthlyInstallment") ||
                    !!draftGet("maxMonthlyInstallment")
                  }
                  onClick={() =>
                    setOpen(open === "monthlyInstallment" ? null : "monthlyInstallment")
                  }
                />
                <FilterDropdown
                  open={open === "monthlyInstallment"}
                  onClose={close}
                  anchorRef={monthlyInstallmentRef}
                  width="lg"
                >
                  <AmountRangePanel
                    title="Monthly installment range"
                    currency={currency}
                    minValue={draftGet("minMonthlyInstallment") ?? ""}
                    maxValue={draftGet("maxMonthlyInstallment") ?? ""}
                    minPlaceholder="e.g. 25000"
                    maxPlaceholder="e.g. 150000"
                    onApply={(min, max) => {
                      draftSetMany({
                        minMonthlyInstallment: min,
                        maxMonthlyInstallment: max,
                      });
                      close();
                    }}
                  />
                </FilterDropdown>
              </div>

              <div ref={unitTypeRef} className="relative shrink-0">
                <FilterTrigger
                  label="Unit type"
                  active={open === "unitType" || !!draftGet("unitType")}
                  count={parseDraftList("unitType").length || undefined}
                  onClick={() => setOpen(open === "unitType" ? null : "unitType")}
                />
                <FilterDropdown open={open === "unitType"} onClose={close} anchorRef={unitTypeRef} width="xl">
                  <ChipPanel
                    options={unitTypes}
                    selected={parseDraftList("unitType")}
                    emptyLabel="No unit types in database"
                    onApply={(vals) => {
                      draftSetOne("unitType", vals.length ? vals.join(",") : null);
                      close();
                    }}
                  />
                </FilterDropdown>
              </div>

              <div ref={bedroomsRef} className="relative shrink-0">
                <FilterTrigger
                  label="Bedrooms"
                  active={open === "bedrooms" || !!draftGet("bedrooms")}
                  count={parseDraftList("bedrooms").length || undefined}
                  onClick={() => setOpen(open === "bedrooms" ? null : "bedrooms")}
                />
                <FilterDropdown open={open === "bedrooms"} onClose={close} anchorRef={bedroomsRef} width="lg">
                  <ChipPanel
                    options={BEDROOMS}
                    selected={parseDraftList("bedrooms")}
                    onApply={(vals) => {
                      draftSetOne("bedrooms", vals.length ? vals.join(",") : null);
                      close();
                    }}
                  />
                </FilterDropdown>
              </div>

              <div ref={statusRef} className="relative shrink-0">
                <FilterTrigger
                  label="Status"
                  active={open === "status" || !!draftGet("status")}
                  count={parseDraftList("status").length || undefined}
                  onClick={() => setOpen(open === "status" ? null : "status")}
                />
                <FilterDropdown open={open === "status"} onClose={close} anchorRef={statusRef} width="xl">
                  <ChipPanel
                    options={statusOptions}
                    selected={parseDraftList("status")}
                    emptyLabel="No progress statuses in database"
                    onApply={(vals) => {
                      draftSetOne("status", vals.length ? vals.join(",") : null);
                      close();
                    }}
                  />
                </FilterDropdown>
              </div>

              <div ref={planRef} className="relative shrink-0">
                <FilterTrigger
                  label="Plan"
                  active={open === "plan" || !!draftGet("plan")}
                  count={parseDraftList("plan").length || undefined}
                  onClick={() => setOpen(open === "plan" ? null : "plan")}
                />
                <FilterDropdown open={open === "plan"} onClose={close} anchorRef={planRef} width="md">
                  <ChipPanel
                    options={plans}
                    selected={parseDraftList("plan")}
                    emptyLabel="No installment plans in database"
                    onApply={(vals) => {
                      draftSetOne("plan", vals.length ? vals.join(",") : null);
                      close();
                    }}
                  />
                </FilterDropdown>
              </div>
            </div>

            <div className="filter-chips-bar__actions">
              <div className="relative min-w-[140px] flex-1 sm:max-w-xs">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden
                />
                <input
                  type="search"
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  placeholder="Search projects…"
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none ring-zinc-900 transition-shadow placeholder:text-zinc-400 focus:ring-2"
                  aria-label="Search projects"
                />
              </div>

              <button
                type="button"
                onClick={onSearchClick}
                disabled={!hasDraftChanges}
                className={cn(
                  "filter-chips-bar__search-btn inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors",
                  hasDraftChanges
                    ? "bg-zinc-900 hover:bg-zinc-800"
                    : "cursor-not-allowed bg-zinc-400"
                )}
              >
                <Search className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
                <span className="whitespace-nowrap">Search</span>
              </button>

              {hasAppliedFilters && (
                <button
                  type="button"
                  onClick={clearDraft}
                  className="min-h-[44px] whitespace-nowrap px-2 text-sm font-medium text-zinc-500 underline-offset-2 transition-colors hover:text-zinc-900 hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {hasDraftChanges && (
            <p className="mt-2 px-4 text-sm text-amber-700 lg:px-6">
              Filters selected. Click Search to update results.
            </p>
          )}

          {pending && (
            <p className="mt-2 px-4 text-sm text-zinc-400 lg:px-6">Updating results…</p>
          )}
        </div>
      </div>

      <HousingBudgetCalculatorModal
        open={open === "housingBudget"}
        onClose={close}
        searchParams={calculatorParams}
        areaOptions={areas}
        onApply={(updates) => {
          applyDraftUpdates(updates);
          close();
        }}
        onClear={() => {
          draftSetMany({
            ...clearHousingBudgetUrlParams(),
            area: null,
            minPrice: null,
            maxPrice: null,
            minDownPayment: null,
            maxDownPayment: null,
            minMonthlyInstallment: null,
            maxMonthlyInstallment: null,
          });
        }}
      />
    </>
  );
}
