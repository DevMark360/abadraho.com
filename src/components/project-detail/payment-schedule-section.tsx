"use client";

import { useEffect, useMemo, useState } from "react";
import { Calculator, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import type { ProjectUnit } from "@/types/project-detail";

const DURATIONS = [
  { value: "", label: "Select duration" },
  { value: "12", label: "12 months" },
  { value: "24", label: "24 months" },
  { value: "36", label: "36 months" },
  { value: "48", label: "48 months" },
  { value: "60", label: "60 months" },
];

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

function defaultDuration(months?: number | null): string {
  if (months == null) return "";
  const value = String(months);
  return DURATIONS.some((d) => d.value === value) ? value : "";
}

export function PaymentScheduleSection({
  projectId,
  units,
  installmentMonths,
}: PaymentScheduleSectionProps) {
  const [unitId, setUnitId] = useState(units[0]?.id ?? 0);
  const [duration, setDuration] = useState(() => defaultDuration(installmentMonths));
  const [downPayment, setDownPayment] = useState("");
  const [monthlyInstallment, setMonthlyInstallment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ScheduleSummary | null>(null);
  const [saved, setSaved] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selected = useMemo(
    () => units.find((u) => u.id === unitId) ?? units[0],
    [units, unitId]
  );

  useEffect(() => {
    if (!selected) return;
    setDownPayment(selected.downPayment != null ? String(selected.downPayment) : "");
    setMonthlyInstallment(
      selected.monthlyInstallment != null ? String(selected.monthlyInstallment) : ""
    );
    setSummary(null);
    setSaved(false);
    setSuccessMessage(null);
    setError(null);
  }, [selected]);

  async function calculate(e: React.FormEvent) {
    e.preventDefault();
    if (!unitId) {
      setError("Please select a unit type.");
      return;
    }
    setLoading(true);
    setError(null);
    setSaved(false);
    setSuccessMessage(null);

    const res = await fetch("/api/v1/payment-schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        unit_id: unitId,
        duration: duration || undefined,
        down_payment: downPayment || undefined,
        monthly_installment: monthlyInstallment || undefined,
      }),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok || !json.success) {
      setError(json.message ?? "Could not calculate payment schedule.");
      setSummary(null);
      return;
    }

    setSummary(json.summary as ScheduleSummary);
    setSaved(true);
    setSuccessMessage(json.message ?? "Payment schedule saved successfully.");
    setError(null);
  }

  if (!units.length) return null;

  return (
    <form
      onSubmit={calculate}
      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
    >
      <div className="border-b border-zinc-100 bg-gradient-to-r from-zinc-900 to-zinc-700 px-5 py-4 text-white">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          <h3 className="font-semibold">Payment schedule</h3>
        </div>
        <p className="mt-1 text-xs text-zinc-300">
          Customize down payment & installments — saved to your account when logged in.
        </p>
      </div>

      <div className="space-y-3 p-5">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Unit type</label>
          <select
            value={unitId}
            onChange={(e) => setUnitId(Number(e.target.value))}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.title ?? `Unit ${u.id}`}
                {u.price ? ` — ${formatPrice(u.price)}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Duration</label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          >
            {DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">Down payment (PKR)</label>
          <input
            type="number"
            min={0}
            value={downPayment}
            onChange={(e) => setDownPayment(e.target.value)}
            placeholder="e.g. 5000000"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Monthly installment (PKR)
          </label>
          <input
            type="number"
            min={0}
            value={monthlyInstallment}
            onChange={(e) => setMonthlyInstallment(e.target.value)}
            placeholder="e.g. 1200000"
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
        </div>

        {selected?.price != null && (
          <div className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            List price: <strong>{formatPrice(selected.price)}</strong>
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Submitting…" : "Submit enquiry"}
        </Button>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {saved && summary && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">{successMessage ?? "Schedule saved"}</span>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-600">Total amount</dt>
                <dd className="font-semibold text-zinc-900">
                  {formatPrice(summary.totalPrice)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-600">Down payment</dt>
                <dd className="font-semibold text-zinc-900">
                  {formatPrice(summary.downPayment)}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-t border-emerald-200/60 pt-2">
                <dt className="font-medium text-zinc-700">Remaining balance</dt>
                <dd className="font-bold text-zinc-900">
                  {formatPrice(summary.remainingAmount)}
                </dd>
              </div>
              {summary.monthlyInstallment != null && (
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-600">Monthly</dt>
                  <dd className="font-semibold">{formatPrice(summary.monthlyInstallment)}</dd>
                </div>
              )}
              {summary.estimatedInstallments != null && (
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-600">Est. installments</dt>
                  <dd className="font-semibold">{summary.estimatedInstallments}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </form>
  );
}
