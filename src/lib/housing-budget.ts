export type HousingBudgetMode = "flat" | "construction";

export const HOUSING_DURATION_OPTIONS = [
  { value: "1", label: "1 Month" },
  { value: "3", label: "3 Months" },
  { value: "6", label: "6 Months" },
  { value: "9", label: "9 Months" },
  { value: "12", label: "12 Months" },
  { value: "24", label: "24 Months" },
  { value: "36", label: "36 Months" },
  { value: "48", label: "48 Months" },
  { value: "60", label: "60 Months" },
] as const;

export interface HousingBudgetForm {
  mode: HousingBudgetMode;
  areaId: string;
  downPayment: string;
  splitDownPayment: boolean;
  booking: string;
  allocation: string;
  confirmation: string;
  startOfWork: string;
  duration: string;
  monthlyInstallment: string;
  quarterlyInstallment: string;
  halfYearlyInstallment: string;
  yearlyInstallment: string;
  possession: string;
  slabCasting: string;
  plinth: string;
  colour: string;
}

export interface HousingBudgetFilter {
  active: boolean;
  mode: HousingBudgetMode;
  areaIds?: number[];
  maxBudget?: number;
  downPayment?: number;
  splitDownPayment?: boolean;
  booking?: number;
  allocation?: number;
  confirmation?: number;
  startOfWork?: number;
  durationMonths?: number;
  monthlyInstallment?: number;
  quarterlyInstallment?: number;
  halfYearlyInstallment?: number;
  yearlyInstallment?: number;
  possession?: number;
  slabCasting?: number;
  plinth?: number;
  colour?: number;
}

export const HOUSING_BUDGET_PARAM_KEYS = [
  "hc",
  "hcMode",
  "hcArea",
  "hcBudget",
  "hcDownPayment",
  "hcSplit",
  "hcBooking",
  "hcAllocation",
  "hcConfirmation",
  "hcStartOfWork",
  "hcDuration",
  "hcMonthly",
  "hcQuarterly",
  "hcHalfYearly",
  "hcYearly",
  "hcPossession",
  "hcSlabCasting",
  "hcPlinth",
  "hcColour",
] as const;

export const defaultHousingBudgetForm = (): HousingBudgetForm => ({
  mode: "flat",
  areaId: "",
  downPayment: "",
  splitDownPayment: false,
  booking: "",
  allocation: "",
  confirmation: "",
  startOfWork: "",
  duration: "1",
  monthlyInstallment: "",
  quarterlyInstallment: "",
  halfYearlyInstallment: "",
  yearlyInstallment: "",
  possession: "",
  slabCasting: "",
  plinth: "",
  colour: "",
});

export function parseHousingAmount(value: string | undefined | null): number {
  if (!value) return 0;
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function computeHousingBudget(form: HousingBudgetForm): number {
  const duration = parseInt(form.duration, 10) || 0;

  const down = form.splitDownPayment
    ? parseHousingAmount(form.booking) +
      parseHousingAmount(form.allocation) +
      parseHousingAmount(form.confirmation) +
      parseHousingAmount(form.startOfWork)
    : parseHousingAmount(form.downPayment);

  const monthly = parseHousingAmount(form.monthlyInstallment) * duration;
  const quarterly =
    parseHousingAmount(form.quarterlyInstallment) * Math.floor(duration / 3);
  const halfYearly =
    parseHousingAmount(form.halfYearlyInstallment) * Math.floor(duration / 6);
  const yearly =
    parseHousingAmount(form.yearlyInstallment) * Math.floor(duration / 12);
  const possession = parseHousingAmount(form.possession);

  let construction = 0;
  if (form.mode === "construction") {
    construction =
      parseHousingAmount(form.slabCasting) +
      parseHousingAmount(form.plinth) +
      parseHousingAmount(form.colour);
  }

  return (
    down + monthly + quarterly + halfYearly + yearly + possession + construction
  );
}

/** Restore calculator form from URL (hc* params or synced standard filters). */
export function housingFormFromUrlParams(
  params: Record<string, string | undefined>
): HousingBudgetForm {
  const fromHc = parseHousingBudgetParams(params);
  if (fromHc) return housingFormFromFilter(fromHc);

  const form = defaultHousingBudgetForm();
  const area = params.area?.split(",").map((s) => s.trim()).filter(Boolean)[0];
  if (area) form.areaId = area;
  if (params.maxDownPayment) form.downPayment = params.maxDownPayment;
  if (params.maxMonthlyInstallment) {
    form.monthlyInstallment = params.maxMonthlyInstallment;
  }
  return form;
}

export function housingFormFromFilter(filter: HousingBudgetFilter): HousingBudgetForm {
  return {
    mode: filter.mode,
    areaId: filter.areaIds?.[0] != null ? String(filter.areaIds[0]) : "",
    downPayment: filter.downPayment != null ? String(filter.downPayment) : "",
    splitDownPayment: !!filter.splitDownPayment,
    booking: filter.booking != null ? String(filter.booking) : "",
    allocation: filter.allocation != null ? String(filter.allocation) : "",
    confirmation: filter.confirmation != null ? String(filter.confirmation) : "",
    startOfWork: filter.startOfWork != null ? String(filter.startOfWork) : "",
    duration: filter.durationMonths != null ? String(filter.durationMonths) : "1",
    monthlyInstallment:
      filter.monthlyInstallment != null ? String(filter.monthlyInstallment) : "",
    quarterlyInstallment:
      filter.quarterlyInstallment != null
        ? String(filter.quarterlyInstallment)
        : "",
    halfYearlyInstallment:
      filter.halfYearlyInstallment != null
        ? String(filter.halfYearlyInstallment)
        : "",
    yearlyInstallment:
      filter.yearlyInstallment != null ? String(filter.yearlyInstallment) : "",
    possession: filter.possession != null ? String(filter.possession) : "",
    slabCasting: filter.slabCasting != null ? String(filter.slabCasting) : "",
    plinth: filter.plinth != null ? String(filter.plinth) : "",
    colour: filter.colour != null ? String(filter.colour) : "",
  };
}

function numParam(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function parseHousingBudgetParams(
  params: Record<string, string | undefined>
): HousingBudgetFilter | undefined {
  if (params.hc !== "1" && !params.hcBudget) return undefined;

  const areaId = params.hcArea ? Number(params.hcArea) : NaN;
  const mode =
    params.hcMode === "construction" ? "construction" : ("flat" as const);

  return {
    active: params.hc === "1",
    mode,
    areaIds: !Number.isNaN(areaId) && areaId > 0 ? [areaId] : undefined,
    maxBudget: numParam(params.hcBudget),
    downPayment: numParam(params.hcDownPayment),
    splitDownPayment: params.hcSplit === "1",
    booking: numParam(params.hcBooking),
    allocation: numParam(params.hcAllocation),
    confirmation: numParam(params.hcConfirmation),
    startOfWork: numParam(params.hcStartOfWork),
    durationMonths: numParam(params.hcDuration),
    monthlyInstallment: numParam(params.hcMonthly),
    quarterlyInstallment: numParam(params.hcQuarterly),
    halfYearlyInstallment: numParam(params.hcHalfYearly),
    yearlyInstallment: numParam(params.hcYearly),
    possession: numParam(params.hcPossession),
    slabCasting: numParam(params.hcSlabCasting),
    plinth: numParam(params.hcPlinth),
    colour: numParam(params.hcColour),
  };
}

export function housingBudgetToUrlParams(
  form: HousingBudgetForm,
  budget: number
): Record<string, string | null> {
  const updates: Record<string, string | null> = {
    hc: "1",
    hcMode: form.mode,
    hcArea: form.areaId || null,
    hcBudget: budget > 0 ? String(budget) : null,
    hcDownPayment: form.splitDownPayment ? "0" : form.downPayment || null,
    hcSplit: form.splitDownPayment ? "1" : null,
    hcBooking: form.splitDownPayment ? form.booking || null : null,
    hcAllocation: form.splitDownPayment ? form.allocation || null : null,
    hcConfirmation: form.splitDownPayment ? form.confirmation || null : null,
    hcStartOfWork: form.splitDownPayment ? form.startOfWork || null : null,
    hcDuration: form.duration || null,
    hcMonthly: form.monthlyInstallment || null,
    hcQuarterly: form.quarterlyInstallment || null,
    hcHalfYearly: form.halfYearlyInstallment || null,
    hcYearly: form.yearlyInstallment || null,
    hcPossession: form.possession || null,
    hcSlabCasting: form.mode === "construction" ? form.slabCasting || null : null,
    hcPlinth: form.mode === "construction" ? form.plinth || null : null,
    hcColour: form.mode === "construction" ? form.colour || null : null,
    maxPrice: budget > 0 ? String(budget) : null,
    minPrice: null,
    area: form.areaId || null,
  };

  const effectiveDp = form.splitDownPayment
    ? parseHousingAmount(form.booking) +
      parseHousingAmount(form.allocation) +
      parseHousingAmount(form.confirmation) +
      parseHousingAmount(form.startOfWork)
    : parseHousingAmount(form.downPayment);

  updates.maxDownPayment = effectiveDp > 0 ? String(effectiveDp) : null;
  updates.minDownPayment = null;
  updates.maxMonthlyInstallment = form.monthlyInstallment || null;
  updates.minMonthlyInstallment = null;

  return updates;
}

export function clearHousingBudgetUrlParams(): Record<string, null> {
  const cleared: Record<string, null> = {};
  for (const key of HOUSING_BUDGET_PARAM_KEYS) {
    cleared[key] = null;
  }
  return cleared;
}

export function effectiveDownPayment(filter: HousingBudgetFilter): number | undefined {
  if (filter.splitDownPayment) {
    const sum =
      (filter.booking ?? 0) +
      (filter.allocation ?? 0) +
      (filter.confirmation ?? 0) +
      (filter.startOfWork ?? 0);
    return sum > 0 ? sum : undefined;
  }
  return filter.downPayment;
}
