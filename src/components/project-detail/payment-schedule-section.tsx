"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Calculator, CheckCircle2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";
import {
  DOWN_PAYMENT_PARTS,
  PLAN_DURATION_MONTHS,
  PLAN_MATCH_TOLERANCE,
  PLAN_PAYMENT_TYPES,
  planMismatch,
  planPaymentCount,
  planTotals,
  type DownPaymentPartKey,
  type PlanPaymentKey,
} from "@/lib/payment-plan";
import type { ProjectUnit } from "@/types/project-detail";

interface PaymentScheduleSectionProps {
  projectId: number;
  units: ProjectUnit[];
  installmentMonths?: number | null;
}

interface ScheduleSummary {
  unitTitle: string | null;
  totalPrice: number;
  downPayment: number;
  remainingAmount: number;
  monthlyInstallment: number | null;
  durationMonths: number | null;
  estimatedInstallments: number | null;
}

const fieldClass =
  "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500";

const EMPTY_SPLIT: Record<DownPaymentPartKey, string> = {
  booking: "",
  allocation: "",
  confirmation: "",
  startOfWork: "",
};

/** Digits only (amounts are whole rupees). */
const digits = (v: string) => v.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
const num = (v: string | undefined) => (v ? Number(v) : 0);
const unitLabel = (u: ProjectUnit) => u.title ?? u.name ?? `Unit ${u.id}`;

function defaultDuration(months?: number | null): string {
  if (months == null) return "";
  return (PLAN_DURATION_MONTHS as readonly number[]).includes(months) ? String(months) : "";
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-zinc-600">
      {children}
    </label>
  );
}

/** Rupee amount with thousands separators while typing; the value stays plain digits. */
function AmountInput({
  id,
  value,
  onChange,
  disabled,
  placeholder = "0",
  ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-medium text-zinc-400">
        Rs
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={ariaLabel}
        value={value ? Number(value).toLocaleString("en-PK") : ""}
        onChange={(e) => onChange(digits(e.target.value).slice(0, 13))}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(fieldClass, "pl-9 tabular-nums")}
      />
    </div>
  );
}

export function PaymentScheduleSection({
  projectId,
  units,
  installmentMonths,
}: PaymentScheduleSectionProps) {
  const [unitId, setUnitId] = useState(units[0]?.id ?? 0);
  const [duration, setDuration] = useState(() => defaultDuration(installmentMonths));
  const [downPayment, setDownPayment] = useState("");
  const [split, setSplit] = useState(false);
  const [parts, setParts] = useState(EMPTY_SPLIT);
  /** Added payment rows, in the order the buyer added them. */
  const [payments, setPayments] = useState<{ key: PlanPaymentKey; amount: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ScheduleSummary | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => units.find((u) => u.id === unitId) ?? units[0], [units, unitId]);
  const price = selected?.price ?? null;

  // New unit → start from that unit's published plan (a fresh form for a different price).
  useEffect(() => {
    if (!selected) return;
    setDownPayment(selected.downPayment != null ? digits(String(Math.round(selected.downPayment))) : "");
    setSplit(false);
    setParts(EMPTY_SPLIT);
    setPayments(
      selected.monthlyInstallment != null
        ? [{ key: "monthly", amount: digits(String(Math.round(selected.monthlyInstallment))) }]
        : []
    );
    setSummary(null);
    setSuccessMessage(null);
    setError(null);
  }, [selected]);

  const durationMonths = Number(duration) || 0;
  const totals = useMemo(
    () =>
      planTotals({
        durationMonths,
        downPayment: num(downPayment),
        split: split
          ? (Object.fromEntries(DOWN_PAYMENT_PARTS.map((p) => [p.key, num(parts[p.key])])) as Record<
              DownPaymentPartKey,
              number
            >)
          : null,
        payments: Object.fromEntries(payments.map((p) => [p.key, num(p.amount)])),
      }),
    [durationMonths, downPayment, split, parts, payments]
  );
  const diff = price ? totals.total - price : 0;
  const matches = price ? Math.abs(diff) <= PLAN_MATCH_TOLERANCE : true;
  const progress = price ? Math.min(100, Math.round((totals.total / price) * 100)) : 0;
  const addable = PLAN_PAYMENT_TYPES.filter((t) => !payments.some((p) => p.key === t.key));
  const needsDuration = payments.some((p) => p.key !== "possession");

  function clearFeedback() {
    if (error) setError(null);
    if (summary) {
      setSummary(null);
      setSuccessMessage(null);
    }
  }

  function showError(message: string) {
    setError(message);
    // Bring the alert into view on phones, where the button can be far below the fields.
    requestAnimationFrame(() => alertRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!unitId) return showError("Please select a unit type.");
    if (needsDuration && !durationMonths) return showError("Select a duration for your installments.");
    if (totals.total <= 0) return showError("Enter a down payment or add at least one payment.");
    // Entered values stay in the form; only the alert appears.
    const mismatch = planMismatch(totals.total, price);
    if (mismatch) return showError(mismatch);

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    const amount = (key: PlanPaymentKey) => payments.find((p) => p.key === key)?.amount || undefined;
    try {
      const res = await fetch("/api/v1/payment-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          unit_id: unitId,
          duration: duration || undefined,
          down_payment: split ? undefined : downPayment || undefined,
          split_down_payment: split,
          booking: split ? parts.booking || undefined : undefined,
          allocation: split ? parts.allocation || undefined : undefined,
          confirmation: split ? parts.confirmation || undefined : undefined,
          start_of_work: split ? parts.startOfWork || undefined : undefined,
          monthly_installment: amount("monthly"),
          quarterly_installment: amount("quarterly"),
          half_yearly_installment: amount("halfYearly"),
          yearly_installment: amount("yearly"),
          possession: amount("possession"),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        showError(json.message ?? "Could not submit your enquiry. Please try again.");
        return;
      }
      setSummary(json.summary as ScheduleSummary);
      setSuccessMessage(json.message ?? "Enquiry submitted.");
    } catch {
      showError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!units.length) return null;

  return (
    <form
      onSubmit={submit}
      noValidate
      className="overflow-hidden rounded-clay-lg border border-white/80 bg-clay-surface shadow-clay"
    >
      <div className="border-b border-zinc-100 bg-gradient-to-r from-zinc-900 to-zinc-700 px-5 py-4 text-white">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5" aria-hidden />
          <h3 className="font-semibold">Payment schedule</h3>
        </div>
        <p className="mt-1 text-xs text-zinc-300">
          Build the plan that suits you. It must add up to the unit price.
        </p>
      </div>

      <div className="space-y-4 p-5">
        {/* 1. Unit */}
        <div>
          <FieldLabel htmlFor="ps-unit">Unit type</FieldLabel>
          <select
            id="ps-unit"
            value={unitId}
            onChange={(e) => setUnitId(Number(e.target.value))}
            className={fieldClass}
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {unitLabel(u)}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Down payment (optionally split) */}
        <div>
          <FieldLabel htmlFor="ps-down">Down payment</FieldLabel>
          <AmountInput
            id="ps-down"
            value={split ? String(totals.downPayment || "") : downPayment}
            onChange={(v) => {
              setDownPayment(v);
              clearFeedback();
            }}
            disabled={split}
          />
          <label className="mt-2 flex cursor-pointer items-center gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={split}
              onChange={(e) => {
                setSplit(e.target.checked);
                clearFeedback();
              }}
              className="h-4 w-4 shrink-0 rounded border-zinc-300 text-brand focus:ring-brand"
            />
            Split down payment
          </label>
          {split ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {DOWN_PAYMENT_PARTS.map((p) => (
                <div key={p.key} className="min-w-0">
                  <FieldLabel htmlFor={`ps-${p.key}`}>{p.label}</FieldLabel>
                  <AmountInput
                    id={`ps-${p.key}`}
                    value={parts[p.key]}
                    onChange={(v) => {
                      setParts((prev) => ({ ...prev, [p.key]: v }));
                      clearFeedback();
                    }}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* 3. Duration */}
        <div>
          <FieldLabel htmlFor="ps-duration">Duration</FieldLabel>
          <select
            id="ps-duration"
            value={duration}
            onChange={(e) => {
              setDuration(e.target.value);
              clearFeedback();
            }}
            className={fieldClass}
          >
            <option value="">Select duration</option>
            {PLAN_DURATION_MONTHS.map((m) => (
              <option key={m} value={m}>
                {m} months{m % 12 === 0 ? ` (${m / 12} year${m === 12 ? "" : "s"})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Installments, added one by one */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-zinc-600">Installments</p>
          {payments.length ? (
            <ul className="space-y-3">
              {payments.map((p) => {
                const type = PLAN_PAYMENT_TYPES.find((t) => t.key === p.key)!;
                const count = planPaymentCount(p.key, durationMonths);
                const subtotal = num(p.amount) * count;
                return (
                  <li key={p.key} className="rounded-xl border border-zinc-200 bg-white p-3">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label htmlFor={`ps-pay-${p.key}`} className="text-xs font-semibold text-zinc-800">
                        {type.label}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setPayments((prev) => prev.filter((x) => x.key !== p.key));
                          clearFeedback();
                        }}
                        className="-mr-1 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                        aria-label={`Remove ${type.label.toLowerCase()}`}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                    <AmountInput
                      id={`ps-pay-${p.key}`}
                      value={p.amount}
                      onChange={(v) => {
                        setPayments((prev) => prev.map((x) => (x.key === p.key ? { ...x, amount: v } : x)));
                        clearFeedback();
                      }}
                    />
                    <p className="mt-1.5 text-xs text-zinc-500 tabular-nums">
                      {type.every === 0
                        ? "Paid once, at possession"
                        : durationMonths
                          ? `${count} payment${count === 1 ? "" : "s"} = ${formatPrice(subtotal)}`
                          : "Select a duration to see the total"}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-zinc-300 px-3 py-3 text-center text-xs text-zinc-500">
              No installments yet. Add the ones you want to pay.
            </p>
          )}
          {addable.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {addable.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setPayments((prev) => [...prev, { key: t.key, amount: "" }]);
                    clearFeedback();
                    requestAnimationFrame(() => document.getElementById(`ps-pay-${t.key}`)?.focus());
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-900 hover:text-zinc-900"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  {t.short}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* 5. Running total against the unit price */}
        <div className="rounded-xl bg-zinc-50 p-3.5 text-sm" aria-live="polite">
          <dl className="space-y-1.5">
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Down payment</dt>
              <dd className="font-medium tabular-nums text-zinc-900">{formatPrice(totals.downPayment)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-zinc-500">Installments</dt>
              <dd className="font-medium tabular-nums text-zinc-900">{formatPrice(totals.installments)}</dd>
            </div>
            <div className="flex justify-between gap-2 border-t border-zinc-200 pt-1.5">
              <dt className="font-semibold text-zinc-800">Plan total</dt>
              <dd className="font-bold tabular-nums text-zinc-900">{formatPrice(totals.total)}</dd>
            </div>
            {price ? (
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Unit price</dt>
                <dd className="font-medium tabular-nums text-zinc-900">{formatPrice(price)}</dd>
              </div>
            ) : null}
          </dl>
          {price ? (
            <>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-200">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    matches ? "bg-emerald-500" : diff > 0 ? "bg-red-500" : "bg-amber-500"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p
                className={cn(
                  "mt-2 flex items-center gap-1.5 text-xs font-medium",
                  matches ? "text-emerald-700" : diff > 0 ? "text-red-600" : "text-amber-700"
                )}
              >
                {matches ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Plan matches the unit price
                  </>
                ) : diff > 0 ? (
                  <>{formatPrice(diff)} over the unit price</>
                ) : (
                  <>{formatPrice(-diff)} left to cover</>
                )}
              </p>
            </>
          ) : null}
        </div>

        <div ref={alertRef}>
          {error ? (
            <div
              role="alert"
              className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          ) : null}
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Submitting…" : "Submit enquiry"}
        </Button>

        {summary ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              <span className="text-sm font-medium">{successMessage ?? "Enquiry submitted"}</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-emerald-900/80">
              We received your plan for {summary.unitTitle ?? "this unit"}. Our team will review it and
              get back to you.
            </p>
          </div>
        ) : null}
      </div>
    </form>
  );
}
