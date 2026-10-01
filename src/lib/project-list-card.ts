import { resolveProjectImageUrls } from "@/lib/project-media";

export type ListingUnitRow = {
  price?: unknown;
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

export function summarizeListingUnits(units: ListingUnitRow[] = []) {
  const prices: number[] = [];
  const installments: number[] = [];
  const areas: number[] = [];
  const bedCounts: number[] = [];

  for (const unit of units) {
    const price = toPositiveNumber(unit.price);
    if (price != null) prices.push(price);

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
