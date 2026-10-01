import type {
  FilterKey,
  MatchTierId,
  MatchedUnitSummary,
} from "@/lib/filter-match-tiers";

export type PricePer = "unit" | "sqft" | "sqm";
export type AreaUnit = "sqft" | "sqm";

export interface ProjectFilters {
  query?: string;
  areaIds?: number[];
  cityIds?: number[];
  projectTypeIds?: number[];
  progressIds?: number[];
  developerIds?: number[];
  unitTypeIds?: number[];
  tiers?: string[];
  bedroomFilters?: string[];
  /** Legacy slug-based status (fallback) */
  statusFilters?: string[];
  /** Installment length bucket start months (36 = 3y plan, etc.) */
  planMonths?: number[];
  handoverFrom?: string;
  handoverTo?: string;
  minPrice?: number;
  maxPrice?: number;
  minDownPayment?: number;
  maxDownPayment?: number;
  minMonthlyInstallment?: number;
  maxMonthlyInstallment?: number;
  pricePer?: PricePer;
  preferredAreaUnit?: AreaUnit;
  handoverOnly?: boolean;
  handoverMonths?: number;
  postHandoverMin?: number;
  preHandoverMax?: number;
  onlyPostHandover?: boolean;
  hasResale?: boolean;
  withDealBonus?: boolean;
  page?: number;
  perPage?: number;
  /** When set, team members only see their assigned projects. */
  viewerUserId?: number;
  /** When set, only these project ids are visible (team-member scoping). */
  allowedProjectIds?: number[];
}

export interface ProjectListItem {
  id: number;
  name: string;
  slug: string;
  area: string | null;
  address: string | null;
  imageUrl: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  progressName: string | null;
  builderName: string | null;
  handoverLabel: string | null;
  installmentMonths: number | null;
  views: number;
  hasDealBonus?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  /** Reelly card badges */
  statusBadge?: string | null;
  handoverQuarter?: string | null;
  paymentPlan?: string | null;
  saleBadge?: string | null;
  advised?: boolean;
  builderLogoUrl?: string | null;
  /** Set when filters are active */
  matchScore?: number;
  totalActiveFilters?: number;
  matchTierId?: MatchTierId;
  matchedUnit?: MatchedUnitSummary | null;
  matchedFilters?: FilterKey[];
  matchFailedFilters?: FilterKey[];
  /** Lowest monthly installment across public units */
  minMonthlyInstallment?: number | null;
  /** e.g. "2 beds", "Studio–3 beds" */
  bedroomLabel?: string | null;
  minAreaSqFt?: number | null;
  maxAreaSqFt?: number | null;
}

export interface ProjectFiltersState extends ProjectFilters {
  sortBy?: "newest" | "price_asc" | "price_desc" | "views";
}
