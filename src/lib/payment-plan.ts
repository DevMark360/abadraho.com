/**
 * Custom payment plan maths, shared by the project page's payment schedule form and the API,
 * so the "plan total must equal the unit price" rule is the same on both sides.
 * Counting follows the Budget Calculator (src/lib/housing-budget.ts): over N months there are
 * N monthly, floor(N/3) quarterly, floor(N/6) half-yearly and floor(N/12) yearly payments.
 */

export const PLAN_DURATION_MONTHS = [
  3, 6, 9, 12, 18, 24, 30, 36, 42, 48, 54, 60, 72, 84, 96, 108, 120,
] as const;

/** Down payment parts when the buyer splits it (same parts as the Budget Calculator). */
export const DOWN_PAYMENT_PARTS = [
  { key: "booking", label: "Booking" },
  { key: "allocation", label: "Allocation" },
  { key: "confirmation", label: "Confirmation" },
  { key: "startOfWork", label: "Start of work" },
] as const;
export type DownPaymentPartKey = (typeof DOWN_PAYMENT_PARTS)[number]["key"];

/** Payments the buyer can add one by one. `every` = months between payments (0 = one-off). */
export const PLAN_PAYMENT_TYPES = [
  { key: "monthly", label: "Monthly installment", short: "Monthly", every: 1 },
  { key: "quarterly", label: "Quarterly installment", short: "Quarterly", every: 3 },
  { key: "halfYearly", label: "Half-yearly installment", short: "Half-yearly", every: 6 },
  { key: "yearly", label: "Yearly installment", short: "Yearly", every: 12 },
  { key: "possession", label: "Possession fee", short: "Possession fee", every: 0 },
] as const;
export type PlanPaymentKey = (typeof PLAN_PAYMENT_TYPES)[number]["key"];

/** Plans within this many rupees of the price count as matching (rounding in installments). */
export const PLAN_MATCH_TOLERANCE = 1000;

export type PaymentPlanInput = {
  durationMonths: number;
  downPayment: number;
  /** When set, the down payment is the sum of these parts. */
  split?: Partial<Record<DownPaymentPartKey, number>> | null;
  payments: Partial<Record<PlanPaymentKey, number>>;
};

export function planPaymentCount(key: PlanPaymentKey, durationMonths: number): number {
  const type = PLAN_PAYMENT_TYPES.find((t) => t.key === key);
  if (!type) return 0;
  if (type.every === 0) return 1;
  return Math.floor(Math.max(0, durationMonths) / type.every);
}

export function planDownPayment(input: Pick<PaymentPlanInput, "downPayment" | "split">): number {
  if (input.split) {
    return DOWN_PAYMENT_PARTS.reduce((sum, p) => sum + (input.split?.[p.key] ?? 0), 0);
  }
  return input.downPayment;
}

export function planTotals(input: PaymentPlanInput) {
  const downPayment = planDownPayment(input);
  const lines = PLAN_PAYMENT_TYPES.filter((t) => input.payments[t.key] != null).map((t) => {
    const amount = input.payments[t.key] ?? 0;
    const count = planPaymentCount(t.key, input.durationMonths);
    return { key: t.key, label: t.label, amount, count, subtotal: amount * count };
  });
  const installments = lines.reduce((sum, l) => sum + l.subtotal, 0);
  return { downPayment, lines, installments, total: downPayment + installments };
}

/** Why the plan doesn't fit the unit price, or null when it matches (or the price is unknown). */
export function planMismatch(total: number, price: number | null | undefined): string | null {
  if (!price || price <= 0) return null;
  const diff = total - price;
  if (Math.abs(diff) <= PLAN_MATCH_TOLERANCE) return null;
  const fmt = (n: number) => `Rs ${Math.round(n).toLocaleString("en-PK")}`;
  return diff < 0
    ? `Your plan adds up to ${fmt(total)}, which is ${fmt(-diff)} less than the unit price of ${fmt(price)}. Adjust the amounts so they add up to the price.`
    : `Your plan adds up to ${fmt(total)}, which is ${fmt(diff)} more than the unit price of ${fmt(price)}. Adjust the amounts so they add up to the price.`;
}
