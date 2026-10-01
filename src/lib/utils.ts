import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_LOCALE: Record<string, string> = {
  PKR: "en-PK",
  AED: "en-AE",
  USD: "en-US",
};

export function formatPrice(
  value: number | string | null | undefined,
  currency = "PKR"
): string {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return "—";
  const locale = CURRENCY_LOCALE[currency] ?? "en-PK";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatArea(
  sqft: number | null | undefined,
  unit: "sqft" | "sqm" = "sqft"
): string {
  if (sqft == null) return "—";
  if (unit === "sqm") {
    return `${Math.round(sqft * 0.092903)} m²`;
  }
  return `${Math.round(sqft).toLocaleString()} sqft`;
}

/** Derive payment plan label e.g. 60/40% from pre/post handover params */
export function paymentPlanLabel(
  preHandoverMax = 60,
  postHandoverMin = 40
): string {
  const pre = Math.min(100, Math.max(0, preHandoverMax));
  const post = Math.min(100, Math.max(0, postHandoverMin));
  if (pre && post) return `${pre}/${post}%`;
  return "—";
}
