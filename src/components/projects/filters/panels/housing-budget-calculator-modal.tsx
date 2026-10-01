"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { apiFetch } from "@/lib/client/api-fetch";
import { createPortal } from "react-dom";
import { Calculator, X } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { designTw } from "@/config/design-tokens";
import {
  computeHousingBudget,
  defaultHousingBudgetForm,
  housingBudgetToUrlParams,
  housingFormFromUrlParams,
  type HousingBudgetForm,
  type HousingBudgetMode,
  HOUSING_DURATION_OPTIONS,
} from "@/lib/housing-budget";

type AreaOption = { value: string; label: string };

const fieldClass =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-xs font-medium text-zinc-600">
      {children}
    </span>
  );
}

export function HousingBudgetCalculatorModal({
  open,
  onClose,
  searchParams,
  areaOptions = [],
  onApply,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  searchParams: URLSearchParams;
  areaOptions?: AreaOption[];
  onApply: (updates: Record<string, string | null>) => void;
  onClear: () => void;
}) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [areas, setAreas] = useState<AreaOption[]>(areaOptions);
  const [form, setForm] = useState<HousingBudgetForm>(defaultHousingBudgetForm);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (areaOptions.length) {
      setAreas(areaOptions);
      return;
    }
    fetch("/api/v1/meta/filters")
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json.areas)) setAreas(json.areas);
      })
      .catch(() => {});
  }, [areaOptions]);

  useEffect(() => {
    if (!open) return;
    setForm(
      housingFormFromUrlParams(Object.fromEntries(searchParams.entries()))
    );
  }, [open, searchParams]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const budget = useMemo(() => computeHousingBudget(form), [form]);

  function patch<K extends keyof HousingBudgetForm>(
    key: K,
    value: HousingBudgetForm[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setMode(mode: HousingBudgetMode) {
    setForm((prev) => ({ ...prev, mode }));
  }

  function handleSplitToggle(checked: boolean) {
    setForm((prev) => ({
      ...prev,
      splitDownPayment: checked,
      downPayment: checked ? "0" : prev.downPayment === "0" ? "" : prev.downPayment,
    }));
  }

  function handleApply() {
    onApply(housingBudgetToUrlParams(form, budget));

    const durationLabel =
      HOUSING_DURATION_OPTIONS.find((o) => o.value === form.duration)?.label ??
      `${form.duration} Months`;

    if (!user) return;

    void apiFetch("/api/v1/search-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "calculator",
        area: form.areaId ? [form.areaId] : null,
        maxBudget: String(budget),
        downPayment: form.splitDownPayment ? "0" : form.downPayment || null,
        booking: form.splitDownPayment ? form.booking || null : null,
        allocation: form.splitDownPayment ? form.allocation || null : null,
        confirmation: form.splitDownPayment ? form.confirmation || null : null,
        startOfWork: form.splitDownPayment ? form.startOfWork || null : null,
        splitDownPayment: form.splitDownPayment,
        monthInstall: form.monthlyInstallment || null,
        quarterlyInstall: form.quarterlyInstallment || null,
        halfYearlyInstall: form.halfYearlyInstallment || null,
        yearlyInstall: form.yearlyInstallment || null,
        possession: form.possession || null,
        projectType: form.mode === "construction" ? "Construction" : "Flat",
        duration: durationLabel,
        slabCasting: form.mode === "construction" ? form.slabCasting || null : null,
        plinth: form.mode === "construction" ? form.plinth || null : null,
        colour: form.mode === "construction" ? form.colour || null : null,
      }),
    }).catch(() => {});

    onClose();
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1300] flex items-end justify-center sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="housing-budget-title"
        className="relative flex max-h-[min(92dvh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-zinc-100 px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-500">
                <Calculator className="h-4 w-4 shrink-0" />
                Budget Calculator
              </div>
              <h2
                id="housing-budget-title"
                className="mt-2 text-lg font-semibold text-zinc-900 sm:text-xl"
              >
                Housing Calculator
              </h2>
              <div className="mt-2 h-1 w-14 rounded-full bg-brand" />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 rounded-xl bg-zinc-50 px-4 py-3 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              My Budget
            </p>
            <p className="mt-0.5 text-xl font-semibold text-zinc-900 sm:text-2xl">
              {formatPrice(budget, "PKR")}
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-zinc-200">
            {(["flat", "construction"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setMode(mode)}
                className={cn(
                  "py-3 text-xs font-semibold uppercase tracking-wide transition-colors sm:text-sm",
                  form.mode === mode
                    ? designTw.btnPrimary
                    : "bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-4">
            {form.mode === "construction" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {(
                  [
                    ["slabCasting", "Slab Casting"],
                    ["plinth", "Plinth"],
                    ["colour", "Colour"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block min-w-0">
                    <FieldLabel>{label}</FieldLabel>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={form[key]}
                      onChange={(e) => patch(key, e.target.value)}
                      placeholder="0"
                      className={fieldClass}
                    />
                  </label>
                ))}
              </div>
            )}

            <label className="block min-w-0">
              <FieldLabel>Please Select Area</FieldLabel>
              <select
                value={form.areaId}
                onChange={(e) => patch("areaId", e.target.value)}
                className={fieldClass}
              >
                <option value="">Please Select</option>
                {areas.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block min-w-0">
              <FieldLabel>Down Payment</FieldLabel>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={form.splitDownPayment ? "0" : form.downPayment}
                onChange={(e) => patch("downPayment", e.target.value)}
                disabled={form.splitDownPayment}
                placeholder="0"
                className={fieldClass}
              />
            </label>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
              <input
                type="checkbox"
                checked={form.splitDownPayment}
                onChange={(e) => handleSplitToggle(e.target.checked)}
                className="h-4 w-4 shrink-0 rounded border-zinc-300 text-brand focus:ring-brand"
              />
              Split Down Payment ?
            </label>

            {form.splitDownPayment && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(
                  [
                    ["booking", "Booking"],
                    ["allocation", "Allocation"],
                    ["confirmation", "Confirmation"],
                    ["startOfWork", "Start of Work"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block min-w-0">
                    <FieldLabel>{label}</FieldLabel>
                    <input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={form[key]}
                      onChange={(e) => patch(key, e.target.value)}
                      placeholder="0"
                      className={fieldClass}
                    />
                  </label>
                ))}
              </div>
            )}

            <label className="block min-w-0">
              <FieldLabel>Payment Duration</FieldLabel>
              <select
                value={form.duration}
                onChange={(e) => patch("duration", e.target.value)}
                className={fieldClass}
              >
                {HOUSING_DURATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(
                [
                  ["monthlyInstallment", "Monthly Installment"],
                  ["quarterlyInstallment", "Quarterly Installment"],
                  ["halfYearlyInstallment", "Half Yearly Installment"],
                  ["yearlyInstallment", "Yearly Installment"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block min-w-0">
                  <FieldLabel>{label}</FieldLabel>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={form[key]}
                    onChange={(e) => patch(key, e.target.value)}
                    placeholder="0"
                    className={fieldClass}
                  />
                </label>
              ))}
            </div>

            <label className="block min-w-0">
              <FieldLabel>Possession Fee</FieldLabel>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={form.possession}
                onChange={(e) => patch("possession", e.target.value)}
                placeholder="0"
                className={fieldClass}
              />
            </label>
          </div>
        </div>

        <div className="shrink-0 border-t border-zinc-100 bg-white p-4 sm:px-6">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setForm(defaultHousingBudgetForm());
                onClear();
              }}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-100 px-5 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-200 sm:w-auto sm:py-2.5"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleApply}
              className={cn(
                "w-full rounded-xl px-5 py-3 text-sm font-semibold sm:w-auto sm:py-2.5",
                designTw.btnPrimary
              )}
            >
              Use Budget In Search
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
