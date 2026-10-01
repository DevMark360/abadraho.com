import type { ProjectFilters } from "@/types/project";

export type FilterKey =
  | "query"
  | "area"
  | "developer"
  | "price"
  | "downPayment"
  | "monthly"
  | "unitType"
  | "bedrooms"
  | "status"
  | "plan";

/** Dynamic key: `full`, `area+price`, `monthly`, `none`, etc. */
export type MatchTierId = string;

export type UnitForMatch = {
  price: unknown;
  downPayment?: unknown;
  monthlyInstallment?: unknown;
  rooms?: string | null;
  title?: string | null;
};

export type ProjectForMatch = {
  id: number;
  name: string;
  address?: string | null;
  projectTypeId?: number | null;
  progressStatusId?: number | null;
  progressLabel?: string | null;
  installmentLength?: number | null;
  minPrice?: unknown;
  discountPrice?: unknown;
  areaIds: number[];
  developerIds: number[];
  developerNames?: string[];
  locationName?: string | null;
  units: UnitForMatch[];
};

export type MatchedUnitSummary = {
  title: string | null;
  price: number | null;
  downPayment: number | null;
  monthlyInstallment: number | null;
};

export type FilterAdjustHint = {
  param: string;
  label: string;
};

export type TierSectionMeta = {
  id: MatchTierId;
  priority: number;
  title: string;
  description?: string;
  filterAdjust?: FilterAdjustHint;
};

export const FILTER_LABELS: Record<FilterKey, string> = {
  query: "Search",
  area: "Area",
  developer: "Developer",
  price: "Price",
  downPayment: "Down payment",
  monthly: "Monthly",
  unitType: "Unit type",
  bedrooms: "Bedrooms",
  status: "Status",
  plan: "Plan",
};

const FILTER_ORDER: FilterKey[] = [
  "area",
  "developer",
  "price",
  "downPayment",
  "monthly",
  "unitType",
  "bedrooms",
  "status",
  "plan",
  "query",
];

const MATCHED_UNIT_PRICE_FILTERS: FilterKey[] = [
  "price",
  "downPayment",
  "monthly",
  "bedrooms",
];

/** Only show unit-specific "Matched price" when a pricing/bedroom filter drove the match. */
export function shouldShowMatchedUnitPrice(
  matchedFilters?: FilterKey[] | null
): boolean {
  if (!matchedFilters?.length) return false;
  return matchedFilters.some((key) => MATCHED_UNIT_PRICE_FILTERS.includes(key));
}

function toNum(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Legacy rows use 0 for “no price”; ignore those in range filters. */
export function meaningfulPrice(value: unknown): number | null {
  const n = toNum(value);
  return n != null && n > 0 ? n : null;
}

function inRange(
  value: number | null,
  min: number | undefined,
  max: number | undefined
): boolean {
  if (value == null) return false;
  const lo = min ?? 0;
  const hi = max ?? Number.POSITIVE_INFINITY;
  return value >= lo && value <= hi;
}

function slugToLabel(slug: string): string {
  return slug.replace(/-/g, " ");
}

function unitMatchesBedroom(rooms: string | null | undefined, bedroom: string): boolean {
  const r = (rooms ?? "").toLowerCase();
  if (bedroom === "studio") {
    return r.includes("studio") || r === "0";
  }
  if (bedroom === "5+") {
    return ["5", "6", "7", "8"].some((n) => r === n || r.startsWith(n) || r.includes(n));
  }
  return r === bedroom || r.startsWith(bedroom) || r.includes(`${bedroom} `);
}

export function getActiveFilters(filters: ProjectFilters): FilterKey[] {
  const active: FilterKey[] = [];
  if (filters.query?.trim()) active.push("query");
  if (filters.areaIds?.length) active.push("area");
  if (filters.developerIds?.length) active.push("developer");
  if (filters.minPrice != null || filters.maxPrice != null) active.push("price");
  if (filters.minDownPayment != null || filters.maxDownPayment != null) {
    active.push("downPayment");
  }
  if (
    filters.minMonthlyInstallment != null ||
    filters.maxMonthlyInstallment != null
  ) {
    active.push("monthly");
  }
  if (filters.unitTypeIds?.length) active.push("unitType");
  if (filters.bedroomFilters?.length) active.push("bedrooms");
  if (filters.progressIds?.length || filters.statusFilters?.length) active.push("status");
  if (filters.planMonths?.length) active.push("plan");
  return FILTER_ORDER.filter((k) => active.includes(k));
}

export function shouldUseMatchTiers(filters: ProjectFilters): boolean {
  return getActiveFilters(filters).length >= 2;
}

export function shouldUseMatchScoring(filters: ProjectFilters): boolean {
  return getActiveFilters(filters).length >= 1;
}

function matchesFilter(
  project: ProjectForMatch,
  unit: UnitForMatch,
  key: FilterKey,
  filters: ProjectFilters
): boolean {
  switch (key) {
    case "query": {
      const q = filters.query?.toLowerCase().trim();
      if (!q) return true;
      return (
        project.name.toLowerCase().includes(q) ||
        (project.address?.toLowerCase().includes(q) ?? false) ||
        (project.locationName?.toLowerCase().includes(q) ?? false) ||
        (project.developerNames?.some((n) => n.toLowerCase().includes(q)) ?? false)
      );
    }
    case "area":
      return (
        !filters.areaIds?.length ||
        filters.areaIds.some((id) => project.areaIds.includes(id))
      );
    case "developer":
      return (
        !filters.developerIds?.length ||
        filters.developerIds.some((id) => project.developerIds.includes(id))
      );
    case "unitType":
      return (
        !filters.unitTypeIds?.length ||
        (project.projectTypeId != null &&
          filters.unitTypeIds.includes(project.projectTypeId))
      );
    case "status":
      if (filters.progressIds?.length) {
        return (
          project.progressStatusId != null &&
          filters.progressIds.includes(project.progressStatusId)
        );
      }
      if (filters.statusFilters?.length) {
        const label = (project.progressLabel ?? "").toLowerCase();
        return filters.statusFilters.some((s) =>
          label.includes(slugToLabel(s).toLowerCase())
        );
      }
      return true;
    case "plan": {
      if (!filters.planMonths?.length) return true;
      const months = project.installmentLength;
      if (months == null) return false;
      return filters.planMonths.some(
        (bucket) => months >= bucket && months < bucket + 12
      );
    }
    case "price": {
      const unitPrice = meaningfulPrice(unit.price);
      if (unitPrice != null && inRange(unitPrice, filters.minPrice, filters.maxPrice)) {
        return true;
      }
      const minP = meaningfulPrice(project.minPrice);
      const disc = meaningfulPrice(project.discountPrice);
      return (
        (minP != null && inRange(minP, filters.minPrice, filters.maxPrice)) ||
        (disc != null && inRange(disc, filters.minPrice, filters.maxPrice))
      );
    }
    case "downPayment":
      return inRange(
        toNum(unit.downPayment),
        filters.minDownPayment,
        filters.maxDownPayment
      );
    case "monthly":
      return inRange(
        toNum(unit.monthlyInstallment),
        filters.minMonthlyInstallment,
        filters.maxMonthlyInstallment
      );
    case "bedrooms":
      return (
        !filters.bedroomFilters?.length ||
        filters.bedroomFilters.some((b) => unitMatchesBedroom(unit.rooms, b))
      );
    default:
      return false;
  }
}

function matchedFilterKey(matched: FilterKey[]): MatchTierId {
  if (!matched.length) return "none";
  return [...matched].sort().join("+");
}

export function getMatchTierKey(
  matched: FilterKey[],
  totalActive: number
): MatchTierId {
  if (!matched.length) return "none";
  if (matched.length === totalActive) return "full";
  return matchedFilterKey(matched);
}

function matchCount(tierId: MatchTierId, total: number): number {
  if (tierId === "full") return total;
  if (tierId === "none") return 0;
  return tierId.split("+").length;
}

export function compareMatchTierIds(
  a: MatchTierId | undefined,
  b: MatchTierId | undefined,
  totalActive = 10
) {
  const ca = matchCount(a ?? "none", totalActive);
  const cb = matchCount(b ?? "none", totalActive);
  if (ca !== cb) return cb - ca;
  if ((a ?? "none") === "full") return -1;
  if ((b ?? "none") === "full") return 1;
  return (a ?? "none").localeCompare(b ?? "none");
}

export function scoreProjectMatch(
  project: ProjectForMatch,
  filters: ProjectFilters
): {
  matchScore: number;
  totalActiveFilters: number;
  tierId: MatchTierId;
  unit: UnitForMatch | null;
  matchedFilters: FilterKey[];
  failedFilters: FilterKey[];
} | null {
  const active = getActiveFilters(filters);
  if (!active.length) return null;

  let bestScore = 0;
  let bestUnit: UnitForMatch | null = null;
  let bestMatched: FilterKey[] = [];

  const units = project.units.length ? project.units : [null as unknown as UnitForMatch];

  for (const unit of units) {
    const u = unit ?? { price: null, title: null };
    const matched = active.filter((key) => matchesFilter(project, u, key, filters));
    const score = matched.length;
    if (score > bestScore) {
      bestScore = score;
      bestUnit = unit;
      bestMatched = matched;
      if (score === active.length) break;
    }
  }

  if (bestScore === 0) return null;

  const failedFilters = active.filter((k) => !bestMatched.includes(k));
  return {
    matchScore: bestScore,
    totalActiveFilters: active.length,
    tierId: getMatchTierKey(bestMatched, active.length),
    unit: bestUnit,
    matchedFilters: bestMatched,
    failedFilters,
  };
}

/** @deprecated use scoreProjectMatch */
export function classifyProjectMatch(
  project: ProjectForMatch,
  filters: ProjectFilters
): {
  tierId: MatchTierId;
  unit: UnitForMatch | null;
  matchedFilters: FilterKey[];
  failedFilters: FilterKey[];
} | null {
  const scored = scoreProjectMatch(project, filters);
  if (!scored || scored.matchScore < 2) return null;
  return {
    tierId: scored.tierId,
    unit: scored.unit,
    matchedFilters: scored.matchedFilters,
    failedFilters: scored.failedFilters,
  };
}

export function mapMatchedUnitSummary(
  unit: UnitForMatch | null
): MatchedUnitSummary | null {
  if (!unit) return null;
  return {
    title: unit.title ?? null,
    price: toNum(unit.price),
    downPayment: toNum(unit.downPayment),
    monthlyInstallment: toNum(unit.monthlyInstallment),
  };
}

function combinations<T>(arr: T[], size: number): T[][] {
  if (size <= 0 || size > arr.length) return [];
  const out: T[][] = [];
  const walk = (start: number, combo: T[]) => {
    if (combo.length === size) {
      out.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      walk(i + 1, combo);
      combo.pop();
    }
  };
  walk(0, []);
  return out;
}

export function filterKeyLabel(key: FilterKey): string {
  return FILTER_LABELS[key] ?? key;
}

export type MatchQualityTier = "perfect" | "excellent" | "great" | "similar";

export function getMatchQualityTier(
  score: number,
  total: number
): MatchQualityTier {
  if (score === total) return "perfect";
  if (score <= 2) return "similar";
  if (score === total - 1) return "excellent";
  if (score === total - 2) return "great";
  return "similar";
}

export function getMatchQualityTitle(score: number, total: number): string {
  const filterWord = total === 1 ? "filter" : "filters";
  if (score === total) {
    return `Perfect Match (${score}/${total} ${filterWord})`;
  }
  if (score <= 2) return "Similar Options";
  if (score === total - 1) {
    return `Excellent Match (${score}/${total} ${filterWord})`;
  }
  if (score === total - 2) {
    return `Great Match (${score}/${total} ${filterWord})`;
  }
  return "More Recommendations";
}

export function getMatchQualityBadge(
  score: number | undefined,
  total: number | undefined
): string | null {
  if (score == null || total == null || total < 2 || score === 0) return null;
  const tier = getMatchQualityTier(score, total);
  switch (tier) {
    case "perfect":
      return "Perfect Match";
    case "excellent":
      return `Excellent · ${score}/${total}`;
    case "great":
      return `Great · ${score}/${total}`;
    case "similar":
      return score <= 1 ? "Similar" : `Similar · ${score}/${total}`;
  }
}

export function getMatchQualityBadgeClass(
  score: number | undefined,
  total: number | undefined
): MatchQualityTier | null {
  if (score == null || total == null || total < 2 || score === 0) return null;
  return getMatchQualityTier(score, total);
}

function filterAdjustForMissing(missing: FilterKey[]): FilterAdjustHint | undefined {
  if (missing.includes("downPayment")) {
    return { param: "maxDownPayment", label: "Increase max down payment" };
  }
  if (missing.includes("monthly")) {
    return { param: "maxMonthlyInstallment", label: "Increase max monthly installment" };
  }
  if (missing.includes("price")) {
    return { param: "maxPrice", label: "Increase max price" };
  }
  return undefined;
}

const QUALITY_TIER_ORDER: MatchQualityTier[] = [
  "perfect",
  "excellent",
  "great",
  "similar",
];

function titleForQualityTier(tier: MatchQualityTier, total: number): string {
  switch (tier) {
    case "perfect":
      return getMatchQualityTitle(total, total);
    case "excellent":
      return getMatchQualityTitle(total - 1, total);
    case "great":
      return getMatchQualityTitle(total - 2, total);
    case "similar":
      return getMatchQualityTitle(Math.min(2, Math.max(1, total - 3)), total);
  }
}

function qualityTiersForFilterCount(total: number): MatchQualityTier[] {
  const present = new Set<MatchQualityTier>();
  for (let score = total; score >= 1; score--) {
    present.add(getMatchQualityTier(score, total));
  }
  return QUALITY_TIER_ORDER.filter((tier) => present.has(tier));
}

export function getTierSections(filters: ProjectFilters): TierSectionMeta[] {
  return getScoreSections(filters);
}

export function getScoreSections(filters: ProjectFilters): TierSectionMeta[] {
  const active = getActiveFilters(filters);
  if (active.length < 2) return [];

  const total = active.length;
  const financialActive = active.filter(
    (k) => k === "price" || k === "downPayment" || k === "monthly"
  );

  return qualityTiersForFilterCount(total).map((tier, index) => ({
    id: tier,
    priority: index + 1,
    title: titleForQualityTier(tier, total),
    filterAdjust:
      tier !== "perfect" && financialActive.length
        ? filterAdjustForMissing(financialActive)
        : undefined,
  }));
}

export function matchScoreBadge(
  matchScore: number | undefined,
  totalActiveFilters: number | undefined
): string | null {
  return getMatchQualityBadge(matchScore, totalActiveFilters);
}

export function isExactMatch(
  matchScore: number | undefined,
  totalActiveFilters: number | undefined
): boolean {
  return (
    matchScore != null &&
    totalActiveFilters != null &&
    matchScore > 0 &&
    matchScore === totalActiveFilters
  );
}

/** @deprecated use matchScoreBadge */
export function matchTierBadge(tierId: MatchTierId | undefined): string | null {
  if (!tierId || tierId === "none") return null;
  if (tierId === "full") return "Exact Match";
  return tierId
    .split("+")
    .map((k) => FILTER_LABELS[k as FilterKey] ?? k)
    .join(" & ");
}

export type FilterSummary = {
  count: number;
  labels: string[];
  useTiers: boolean;
  tierSections: TierSectionMeta[];
};

export function buildFilterSummary(
  filters: ProjectFilters,
  params: Record<string, string | undefined>
): FilterSummary {
  const labels: string[] = [];
  if (params.q) labels.push("Search");
  if (params.area) labels.push("Area");
  if (params.developer) labels.push("Developer");
  if (params.minPrice || params.maxPrice) labels.push("Price");
  if (params.minDownPayment || params.maxDownPayment) labels.push("Down payment");
  if (params.minMonthlyInstallment || params.maxMonthlyInstallment) {
    labels.push("Monthly");
  }
  if (params.unitType) labels.push("Unit type");
  if (params.bedrooms) labels.push("Bedrooms");
  if (params.status) labels.push("Status");
  if (params.plan) labels.push("Plan");

  const unique = [...new Set(labels)];

  return {
    count: unique.length,
    labels: unique,
    useTiers: shouldUseMatchTiers(filters),
    tierSections: getTierSections(filters),
  };
}

export function suggestFilterMax(
  projects: { matchedUnit?: MatchedUnitSummary | null }[],
  param: string
): number | null {
  const values: number[] = [];
  for (const p of projects) {
    const u = p.matchedUnit;
    if (!u) continue;
    if (param === "maxDownPayment" && u.downPayment != null) values.push(u.downPayment);
    if (param === "maxMonthlyInstallment" && u.monthlyInstallment != null) {
      values.push(u.monthlyInstallment);
    }
    if (param === "maxPrice" && u.price != null) values.push(u.price);
  }
  if (!values.length) return null;
  return Math.max(...values);
}

/** @deprecated use FilterKey */
export type FinancialFilterKey = FilterKey;
