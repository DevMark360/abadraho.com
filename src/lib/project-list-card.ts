import { resolveProjectImageUrls } from "@/lib/project-media";

export type ListingUnitRow = {
  price?: unknown;
  totalUnitAmount?: unknown;
  downPayment?: unknown;
  monthlyInstallment?: unknown;
  rooms?: string | null;
  title?: string | null;
  grossArea?: unknown;
  size?: unknown;
};

function toPositiveNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === "object" && value !== null && "toNumber" in value
    ? Number((value as { toNumber: () => number }).toNumber())
    : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseBedCount(rooms: string | null | undefined): number | null {
  const text = rooms?.trim();
  if (!text) return null;
  if (/studio/i.test(text)) return 0;
  const match = text.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

export function formatBedroomLabel(counts: number[]): string | null {
  if (!counts.length) return null;
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  if (min === 0 && max === 0) return "Studio";
  if (min === max) return min === 1 ? "1 bed" : `${min} beds`;
  if (min === 0) return `Studio–${max} beds`;
  return `${min}–${max} beds`;
}

/**
 * What a buyer pays in total for a unit: the total amount (price plus installment loan) when the
 * admin entered one, otherwise the unit price. Used for every "Price from" / "Starting from".
 */
export function unitStartPrice(unit: Pick<ListingUnitRow, "price" | "totalUnitAmount">): number | null {
  return toPositiveNumber(unit.totalUnitAmount) ?? toPositiveNumber(unit.price);
}

export function summarizeListingUnits(units: ListingUnitRow[] = []) {
  const prices: number[] = [];
  const installments: number[] = [];
  const areas: number[] = [];
  const bedCounts: number[] = [];
  const perSqFt: number[] = [];

  for (const unit of units) {
    const price = unitStartPrice(unit);
    if (price != null) prices.push(price);

    // Same rule as the unit's "Price per sq.ft": gross area only, no fallback.
    const gross = toPositiveNumber(unit.grossArea);
    if (price != null && gross != null) perSqFt.push(Math.round(price / gross));

    const monthly = toPositiveNumber(unit.monthlyInstallment);
    if (monthly != null) installments.push(monthly);

    const area = toPositiveNumber(unit.grossArea) ?? toPositiveNumber(unit.size);
    if (area != null) areas.push(area);

    const beds = parseBedCount(unit.rooms);
    if (beds != null) bedCounts.push(beds);
  }

  return {
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    minMonthlyInstallment: installments.length ? Math.min(...installments) : null,
    minAreaSqFt: areas.length ? Math.min(...areas) : null,
    maxAreaSqFt: areas.length ? Math.max(...areas) : null,
    bedroomLabel: formatBedroomLabel(bedCounts),
    minPricePerSqFt: perSqFt.length ? Math.min(...perSqFt) : null,
  };
}

export function resolveListingImageUrl(
  cover: string | null | undefined,
  gallery: string | null | undefined
): string | null {
  const urls = resolveProjectImageUrls(cover, gallery);
  return urls[0] ?? null;
}

export function formatAreaLabel(
  minSqFt: number | null | undefined,
  maxSqFt?: number | null
): string | null {
  if (minSqFt == null || minSqFt <= 0) return null;
  if (maxSqFt != null && maxSqFt > minSqFt) {
    return `${Math.round(minSqFt).toLocaleString("en-PK")}–${Math.round(maxSqFt).toLocaleString("en-PK")} sq.ft`;
  }
  return `${Math.round(minSqFt).toLocaleString("en-PK")} sq.ft`;
}
