import { clampPage, clampPerPage, LISTINGS_PAGE_SIZE } from "@/lib/pagination";
import type { ProjectFilters } from "@/types/project";

export type ParseProjectFiltersOptions = {
  maxPerPage?: number;
  defaultPerPage?: number;
};

export function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export function parseProjectFilters(
  params: Record<string, string | undefined>,
  options?: ParseProjectFiltersOptions
): ProjectFilters {
  const defaultPerPage = options?.defaultPerPage ?? LISTINGS_PAGE_SIZE;
  const rawPerPage = params.perPage ? Number(params.perPage) : defaultPerPage;
  const perPage =
    options?.maxPerPage != null
      ? clampPerPage(rawPerPage, defaultPerPage, options.maxPerPage)
      : Number.isFinite(rawPerPage) && rawPerPage >= 1
        ? Math.floor(rawPerPage)
        : defaultPerPage;
  const progressIds = parseCsv(params.status)
    .map(Number)
    .filter((n) => !Number.isNaN(n) && n > 0);

  const areaIds = parseCsv(params.area)
    .map(Number)
    .filter((n) => !Number.isNaN(n) && n > 0);

  const cityIds = parseCsv(params.city)
    .map(Number)
    .filter((n) => !Number.isNaN(n) && n > 0);

  const planMonths = parseCsv(params.plan)
    .map(Number)
    .filter((n) => !Number.isNaN(n) && n > 0);

  return {
    query: params.q,
    minPrice: params.minPrice ? Number(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
    minDownPayment: params.minDownPayment ? Number(params.minDownPayment) : undefined,
    maxDownPayment: params.maxDownPayment ? Number(params.maxDownPayment) : undefined,
    minMonthlyInstallment: params.minMonthlyInstallment
      ? Number(params.minMonthlyInstallment)
      : undefined,
    maxMonthlyInstallment: params.maxMonthlyInstallment
      ? Number(params.maxMonthlyInstallment)
      : undefined,
    developerIds: parseCsv(params.developer)
      .map(Number)
      .filter((n) => !Number.isNaN(n)),
    unitTypeIds: parseCsv(params.unitType)
      .map(Number)
      .filter((n) => !Number.isNaN(n)),
    tiers: parseCsv(params.tier).length ? parseCsv(params.tier) : undefined,
    bedroomFilters: parseCsv(params.bedrooms),
    statusFilters: parseCsv(params.status).filter((s) => Number.isNaN(Number(s))),
    progressIds: progressIds.length ? progressIds : undefined,
    areaIds: areaIds.length ? areaIds : undefined,
    cityIds: cityIds.length ? cityIds : undefined,
    planMonths: planMonths.length ? planMonths : undefined,
    handoverFrom: params.handoverFrom,
    handoverTo: params.handoverTo,
    preHandoverMax: params.preHandoverMax
      ? Number(params.preHandoverMax)
      : undefined,
    postHandoverMin: params.postHandoverMin
      ? Number(params.postHandoverMin)
      : undefined,
    onlyPostHandover: params.onlyPostHandover === "true",
    withDealBonus: params.withDealBonus === "true",
    page: clampPage(params.page ? Number(params.page) : 1),
    perPage,
  };
}
