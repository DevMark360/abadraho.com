"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Eye } from "lucide-react";
import { AdminMultiSelect } from "@/components/admin/admin-multi-select";
import { AdminDbAlert, AdminPageToolbar, adminCard, adminTableHead } from "@/components/admin/admin-ui";
import { fmtDate, fmtNum } from "@/components/admin/admin-search-history-format";

const DURATION_OPTIONS = [
  { value: "1", label: "1 Month" },
  { value: "3", label: "3 Months" },
  { value: "6", label: "6 Months" },
  { value: "9", label: "9 Months" },
  { value: "12", label: "12 Months" },
  { value: "24", label: "24 Months" },
  { value: "36", label: "36 Months" },
  { value: "48", label: "48 Months" },
  { value: "60", label: "60 Months" },
];

export function AdminPaymentSchedulesClient() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ value: string; label: string }[]>([]);
  const [units, setUnits] = useState<{ value: string; label: string }[]>([]);
  const [applied, setApplied] = useState<URLSearchParams>(new URLSearchParams());

  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [unitIds, setUnitIds] = useState<string[]>([]);
  const [duration, setDuration] = useState<string[]>([]);
  const [downPayment, setDownPayment] = useState("");
  const [monthlyInstallment, setMonthlyInstallment] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/payment-schedules?${applied}`);
    const json = await res.json();
    if (!json.success) {
      setError(json.error ?? "Failed to load");
      setItems([]);
    } else {
      setError(null);
      setItems(json.items ?? []);
      if (json.projects) setProjects(json.projects);
      if (json.units) setUnits(json.units);
    }
    setLoading(false);
  }, [applied]);

  useEffect(() => {
    load();
  }, [load]);

  function applyFilters() {
    const p = new URLSearchParams();
    if (projectIds.length) p.set("projectIds", projectIds.join(","));
    if (unitIds.length) p.set("unitIds", unitIds.join(","));
    if (duration.length) p.set("duration", duration.join(","));
    if (downPayment) p.set("downPayment", downPayment);
    if (monthlyInstallment) p.set("monthlyInstallment", monthlyInstallment);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    setApplied(p);
  }

  return (
    <div className="space-y-4">
      <AdminPageToolbar total={items.length}>
        <Button asChild variant="outline" className="gap-1.5">
          <a href={`/api/admin/export/payment-schedules?${applied}`}>
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        </Button>
      </AdminPageToolbar>

      <div className={`${adminCard} relative z-20 overflow-visible`}>
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-800">Payment plan filters</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminMultiSelect label="Project" options={projects} value={projectIds} onChange={setProjectIds} placeholder="All" />
            <AdminMultiSelect label="Unit" options={units} value={unitIds} onChange={setUnitIds} placeholder="All" />
            <AdminMultiSelect label="Duration" options={DURATION_OPTIONS} value={duration} onChange={setDuration} placeholder="All" />
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Max down payment</span>
              <Input layout="field" type="number" min={0} value={downPayment} onChange={(e) => setDownPayment(e.target.value)} />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Max monthly installment</span>
              <Input layout="field" type="number" min={0} value={monthlyInstallment} onChange={(e) => setMonthlyInstallment(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">From</span>
              <Input layout="field" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">To</span>
              <Input layout="field" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={applyFilters}>
              Search
            </Button>
            <Button type="button" variant="outline" onClick={() => {
              setProjectIds([]);
              setUnitIds([]);
              setDuration([]);
              setDownPayment("");
              setMonthlyInstallment("");
              setFrom("");
              setTo("");
              setApplied(new URLSearchParams());
            }}>
              Reset
            </Button>
          </div>
        </div>
      </div>

      {error && <AdminDbAlert message={error} />}

      <div className={`${adminCard} overflow-x-auto p-4`}>
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">User</th>
              <th className="px-2 py-2">Phone</th>
              <th className="px-2 py-2">Email</th>
              <th className="px-2 py-2">Project</th>
              <th className="px-2 py-2">Unit</th>
              <th className="px-2 py-2">Duration</th>
              <th className="px-2 py-2">Down Pmt</th>
              <th className="px-2 py-2">Monthly</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="px-4 py-8"><LoadingState size="sm" inline className="w-full" /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={11} className="py-8 text-center text-zinc-500">No records</td></tr>
            ) : (
              items.map((r) => (
                <tr key={r.id as number} className="border-t border-zinc-100">
                  <td className="px-2 py-2">{r.rowNum as number}</td>
                  <td className="whitespace-nowrap px-2 py-2">{fmtDate(r.createdAt as string)}</td>
                  <td className="px-2 py-2">{r.userName as string}</td>
                  <td className="px-2 py-2">{(r.phone as string) ?? "—"}</td>
                  <td className="px-2 py-2">{(r.email as string) ?? "—"}</td>
                  <td className="px-2 py-2">{(r.projectName as string) ?? "—"}</td>
                  <td className="px-2 py-2">{(r.unitTitle as string) ?? "—"}</td>
                  <td className="px-2 py-2">{r.duration as string}</td>
                  <td className="px-2 py-2">{fmtNum(r.downPayment as number)}</td>
                  <td className="px-2 py-2">{fmtNum(r.monthlyInstallment as number)}</td>
                  <td className="px-2 py-2">
                    <Link href={`/admin/payment-schedules/${r.id}`} className="rounded p-1.5 text-zinc-600 hover:bg-zinc-100"><Eye className="h-4 w-4" /></Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
