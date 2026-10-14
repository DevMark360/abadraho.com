import { unitStartPrice } from "@/lib/project-list-card";
import { formatSqFt, unitPricePerSqFt } from "@/lib/unit-metrics";
import { formatPrice } from "@/lib/utils";
import type { ProjectUnit } from "@/types/project-detail";

/** 0 / 1: that side wins; "tie": equal; null: not enough data to say. */
export type VerdictWinner = 0 | 1 | "tie" | null;

export type VerdictRow = {
  label: string;
  winner: VerdictWinner;
  reason: string;
  /** Location and developer come from the AI, everything else from the listed figures. */
  ai?: boolean;
  /** AI verdict still loading. */
  pending?: boolean;
};

/** Shape returned by /api/v1/compare/verdicts for one criterion. */
export type AiVerdict = {
  winner: "first" | "second" | "tie";
  reason: string;
  source: "same" | "ai" | "manual";
} | null;

const NO_DATA = "Not enough data to compare.";

function compareNumbers(
  label: string,
  values: [number | null, number | null],
  better: "lower" | "higher",
  describe: (difference: number) => string,
  tieReason: string
): VerdictRow {
  const [a, b] = values;
  if (a == null || b == null) return { label, winner: null, reason: NO_DATA };
  if (a === b) return { label, winner: "tie", reason: tieReason };
  const winner: 0 | 1 = (better === "lower" ? a < b : a > b) ? 0 : 1;
  return { label, winner, reason: describe(Math.abs(a - b)) };
}

const positive = (value: number | null | undefined) => (value != null && value > 0 ? value : null);
const nonNegative = (value: number | null | undefined) => (value != null && value >= 0 ? value : null);

/** Rows worked out from the listed figures; no AI involved. */
export function figureVerdicts(units: [ProjectUnit, ProjectUnit]): Record<
  "totalAmount" | "pricePerSqFt" | "grossArea" | "loanAmount",
  VerdictRow
> {
  return {
    totalAmount: compareNumbers(
      "Total amount",
      [unitStartPrice(units[0]), unitStartPrice(units[1])],
      "lower",
      (d) => `${formatPrice(d)} cheaper in total.`,
      "Same total amount."
    ),
    pricePerSqFt: compareNumbers(
      "Price per sq.ft",
      [unitPricePerSqFt(units[0]), unitPricePerSqFt(units[1])],
      "lower",
      (d) => `${formatPrice(d)} less per sq.ft.`,
      "Same price per sq.ft."
    ),
    grossArea: compareNumbers(
      "Gross area",
      [positive(units[0].grossArea), positive(units[1].grossArea)],
      "higher",
      (d) => `${formatSqFt(d)} larger.`,
      "Same gross area."
    ),
    loanAmount: compareNumbers(
      "Loan amount",
      [nonNegative(units[0].loanAmount), nonNegative(units[1].loanAmount)],
      "lower",
      (d) => `${formatPrice(d)} less left to pay in installments.`,
      "Same loan amount."
    ),
  };
}

export function aiVerdictRow(label: string, verdict: AiVerdict | undefined): VerdictRow {
  if (verdict === undefined) return { label, winner: null, reason: "Checking…", ai: true, pending: true };
  if (verdict === null) return { label, winner: null, reason: "Not available right now.", ai: true };
  const winner: VerdictWinner = verdict.winner === "first" ? 0 : verdict.winner === "second" ? 1 : "tie";
  // Identical names are a plain fact, not an opinion.
  return { label, winner, reason: verdict.reason, ai: verdict.source !== "same" };
}

/** Wins per side, ignoring ties and rows without data. */
export function countWins(rows: VerdictRow[]): [number, number] {
  return rows.reduce<[number, number]>(
    (acc, row) => {
      if (row.winner === 0) acc[0]++;
      if (row.winner === 1) acc[1]++;
      return acc;
    },
    [0, 0]
  );
}
