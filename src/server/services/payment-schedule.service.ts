import { isDatabaseEnabled } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { planMismatch, planTotals } from "@/lib/payment-plan";

function parseAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isNaN(n) ? null : n;
}

export interface PaymentScheduleInput {
  projectId?: number;
  unitId: number;
  userId?: number | null;
  duration?: number | null;
  downPayment?: number | null;
  monthlyInstallment?: number | null;
  quarterlyInstallment?: number | null;
  halfYearlyInstallment?: number | null;
  yearlyInstallment?: number | null;
  possession?: number | null;
  loanAmount?: number | null;
  slabCasting?: number | null;
  plinth?: number | null;
  colour?: number | null;
  startOfWork?: number | null;
  /** Down payment split into parts (the down payment is then their sum). */
  splitDownPayment?: boolean;
  booking?: number | null;
  allocation?: number | null;
  confirmation?: number | null;
}

export interface PaymentScheduleSummary {
  unitTitle: string | null;
  totalPrice: number;
  downPayment: number;
  remainingAmount: number;
  monthlyInstallment: number | null;
  durationMonths: number | null;
  estimatedInstallments: number | null;
}

export async function createPaymentSchedule(
  input: PaymentScheduleInput
): Promise<{ success: true; summary: PaymentScheduleSummary } | { success: false; message: string }> {
  if (!isDatabaseEnabled()) {
    return { success: false, message: "Database is not enabled." };
  }

  const unitId = Number(input.unitId);
  if (!unitId || Number.isNaN(unitId)) {
    return { success: false, message: "Please select a unit type." };
  }

  const unit = await prisma.unit.findFirst({
    where: { id: unitId, isArchive: false },
  });
  if (!unit) {
    return { success: false, message: "Unit not found." };
  }

  const split = Boolean(input.splitDownPayment);
  const parts = {
    booking: split ? parseAmount(input.booking) : null,
    allocation: split ? parseAmount(input.allocation) : null,
    confirmation: split ? parseAmount(input.confirmation) : null,
    startOfWork: parseAmount(input.startOfWork),
  };
  const monthlyInstallment = parseAmount(input.monthlyInstallment);
  const quarterlyInstallment = parseAmount(input.quarterlyInstallment);
  const halfYearlyInstallment = parseAmount(input.halfYearlyInstallment);
  const yearlyInstallment = parseAmount(input.yearlyInstallment);
  const possession = parseAmount(input.possession);
  const amounts = [
    parseAmount(input.downPayment),
    ...Object.values(parts),
    monthlyInstallment,
    quarterlyInstallment,
    halfYearlyInstallment,
    yearlyInstallment,
    possession,
  ];
  if (amounts.some((a) => a != null && (a < 0 || !Number.isFinite(a)))) {
    return { success: false, message: "Amounts can't be negative." };
  }

  const durationMonths = parseAmount(input.duration);
  if (
    !durationMonths &&
    [monthlyInstallment, quarterlyInstallment, halfYearlyInstallment, yearlyInstallment].some((a) => a)
  ) {
    return { success: false, message: "Select a duration for your installments." };
  }

  // Same rule as the form: the plan must add up to the unit price.
  const totals = planTotals({
    durationMonths: durationMonths ?? 0,
    downPayment: parseAmount(input.downPayment) ?? 0,
    split: split
      ? {
          booking: parts.booking ?? 0,
          allocation: parts.allocation ?? 0,
          confirmation: parts.confirmation ?? 0,
          startOfWork: parts.startOfWork ?? 0,
        }
      : null,
    payments: {
      ...(monthlyInstallment != null ? { monthly: monthlyInstallment } : {}),
      ...(quarterlyInstallment != null ? { quarterly: quarterlyInstallment } : {}),
      ...(halfYearlyInstallment != null ? { halfYearly: halfYearlyInstallment } : {}),
      ...(yearlyInstallment != null ? { yearly: yearlyInstallment } : {}),
      ...(possession != null ? { possession } : {}),
    },
  });
  if (totals.total <= 0) {
    return { success: false, message: "Enter a down payment or add at least one payment." };
  }
  const totalPrice = unit.price != null ? Number(unit.price) : 0;
  const mismatch = planMismatch(totals.total, totalPrice);
  if (mismatch) return { success: false, message: mismatch };

  const downPayment = totals.downPayment;
  const remainingAmount = Math.max(0, totalPrice - downPayment);

  const payload = {
    duration: durationMonths,
    down_payment: downPayment,
    split_down_payment: split,
    booking: parts.booking,
    allocation: parts.allocation,
    confirmation: parts.confirmation,
    monthly_installment: monthlyInstallment,
    quarterly_installment: quarterlyInstallment,
    half_yearly_installment: halfYearlyInstallment,
    yearly_installment: yearlyInstallment,
    possession,
    plan_total: totals.total,
    loan_amount: parseAmount(input.loanAmount),
    slab_casting: parseAmount(input.slabCasting),
    plinth: parseAmount(input.plinth),
    colour: parseAmount(input.colour),
    start_of_work: parts.startOfWork,
  };

  await prisma.paymentSchedule.create({
    data: {
      userId: input.userId ?? null,
      projectId: input.projectId ?? unit.projectId,
      unitId: unit.id,
      downPayment,
      monthlyInstallment,
      quarterlyInstallment: payload.quarterly_installment,
      halfYearlyInstallment: payload.half_yearly_installment,
      yearlyInstallment: payload.yearly_installment,
      possession: payload.possession,
      loanAmount: payload.loan_amount,
      slabCasting: payload.slab_casting,
      plinth: payload.plinth,
      colour: payload.colour,
      startOfWork: payload.start_of_work,
      json: JSON.stringify(payload),
    },
  });

  let estimatedInstallments: number | null = null;
  if (monthlyInstallment && monthlyInstallment > 0 && remainingAmount > 0) {
    estimatedInstallments = Math.ceil(remainingAmount / monthlyInstallment);
  }

  return {
    success: true,
    summary: {
      unitTitle: unit.title,
      totalPrice,
      downPayment,
      remainingAmount,
      monthlyInstallment,
      durationMonths,
      estimatedInstallments,
    },
  };
}

export function formatScheduleSummaryHtml(summary: PaymentScheduleSummary): string {
  const rows = [
    ["Total amount", formatPrice(summary.totalPrice)],
    ["Down payment", formatPrice(summary.downPayment)],
    ["Remaining balance", formatPrice(summary.remainingAmount)],
  ];
  if (summary.monthlyInstallment != null) {
    rows.push(["Monthly installment", formatPrice(summary.monthlyInstallment)]);
  }
  if (summary.durationMonths != null) {
    rows.push(["Plan duration", `${summary.durationMonths} months`]);
  }
  if (summary.estimatedInstallments != null) {
    rows.push(["Est. installments", String(summary.estimatedInstallments)]);
  }

  return `<table class="w-full text-sm"><tbody>${rows
    .map(
      ([label, val]) =>
        `<tr><td class="py-1 pr-4 text-zinc-500">${label}</td><td class="py-1 font-semibold">${val}</td></tr>`
    )
    .join("")}</tbody></table>`;
}
