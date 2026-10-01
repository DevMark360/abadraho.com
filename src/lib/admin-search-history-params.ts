import type { SearchHistoryListFilters } from "@/server/services/admin-search-history.service";

function num(v: string | null): number | undefined {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function intList(v: string | null): number[] | undefined {
  if (!v) return undefined;
  const arr = v.split(",").map(Number).filter((n) => Number.isFinite(n) && n > 0);
  return arr.length ? arr : undefined;
}

function strList(v: string | null): string[] | undefined {
  if (!v) return undefined;
  const arr = v.split(",").map((s) => s.trim()).filter(Boolean);
  return arr.length ? arr : undefined;
}

export function parseSearchHistoryParams(
  sp: URLSearchParams,
  mode: SearchHistoryListFilters["mode"]
): SearchHistoryListFilters {
  return {
    mode,
    page: Number(sp.get("page") ?? 1) || 1,
    perPage: Number(sp.get("perPage") ?? 25) || 25,
    mainFiltered: sp.get("mainFiltered") === "1",
    area: intList(sp.get("area")),
    progress: strList(sp.get("progress")),
    type: intList(sp.get("type")),
    builder: intList(sp.get("builder")),
    minDownPayment: num(sp.get("minDownPayment")),
    maxDownPayment: num(sp.get("maxDownPayment")),
    minMonthlyInstall: num(sp.get("minMonthlyInstall")),
    maxMonthlyInstall: num(sp.get("maxMonthlyInstall")),
    minPrice: num(sp.get("minPrice")),
    maxPrice: num(sp.get("maxPrice")),
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
    maxBudget: num(sp.get("maxBudget")),
    projectType: sp.get("projectType") ?? undefined,
    duration: strList(sp.get("duration")),
    downPayment: num(sp.get("downPayment")),
    slabCasting: num(sp.get("slabCasting")),
    plinth: num(sp.get("plinth")),
    colour: num(sp.get("colour")),
    monthInstall: num(sp.get("monthInstall")),
    quarterlyInstall: num(sp.get("quarterlyInstall")),
    halfYearlyInstall: num(sp.get("halfYearlyInstall")),
    yearlyInstall: num(sp.get("yearlyInstall")),
    possession: num(sp.get("possession")),
    search: sp.get("search") ?? undefined,
  };
}
