"use client";
import { LoadingState } from "@/components/ui/loading-state";
import { Input } from "@/components/ui/input";
import { AdminSelect } from "@/components/admin/admin-select";
import { Button } from "@/components/ui/button";

import { useCallback, useEffect, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { AdminMultiSelect } from "@/components/admin/admin-multi-select";
import { AdminDbAlert, AdminPageToolbar, AdminPagination, adminCard, adminTableHead } from "@/components/admin/admin-ui";
import { AdminCan } from "@/components/admin/admin-permissions-provider";
import { fmtDate, fmtNum, joinNames } from "@/components/admin/admin-search-history-format";

const PER_PAGE = 25;

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

const EXPORT_FIELDS = [
  "Area",
  "Budget",
  "Project Type",
  "Duration",
  "Down Payment",
  "Monthly Installment",
  "Quarterly Installment",
  "Half Yearly Installment",
  "Yearly Installment",
  "Possession",
  "Slab Casting",
  "Plinth",
  "Colour",
];

type Row = {
  rowNum: number;
  id: number;
  createdAt: string | null;
  userName: string;
  phone: string | null;
  email: string | null;
  areaNames: string[];
  maxBudget: number | null;
  projectType: string | null;
  duration: string[];
  downPayment: number | null;
  slabCasting: number | null;
  plinth: number | null;
  colour: number | null;
  monthInstall: number | null;
  quarterlyInstall: number | null;
  halfYearlyInstall: number | null;
  yearlyInstall: number | null;
  possession: number | null;
};

export function AdminHousingCalcSearchHistoryClient() {
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [areaOptions, setAreaOptions] = useState<{ value: string; label: string }[]>([]);
  const [exportFields, setExportFields] = useState<string[]>([]);

  const [maxBudget, setMaxBudget] = useState("");
  const [projectType, setProjectType] = useState("");
  const [duration, setDuration] = useState<string[]>([]);
  const [area, setArea] = useState<string[]>([]);
  const [downPayment, setDownPayment] = useState("");
  const [slabCasting, setSlabCasting] = useState("");
  const [plinth, setPlinth] = useState("");
  const [colour, setColour] = useState("");
  const [monthInstall, setMonthInstall] = useState("");
  const [quarterlyInstall, setQuarterlyInstall] = useState("");
  const [halfYearlyInstall, setHalfYearlyInstall] = useState("");
  const [yearlyInstall, setYearlyInstall] = useState("");
  const [possession, setPossession] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState<URLSearchParams>(new URLSearchParams());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(applied);
      params.set("page", String(page));
      params.set("perPage", String(PER_PAGE));
      const res = await fetch(`/api/admin/housing-calc-search-history?${params}`);
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? json.message ?? "Failed to load");
        setItems([]);
        setTotal(0);
      } else {
        setItems(json.items ?? []);
        setTotal(json.total ?? 0);
        if (json.filterOptions?.areas) {
          setAreaOptions(
            json.filterOptions.areas.map((a: { id: number; name: string }) => ({
              value: String(a.id),
              label: a.name,
            }))
          );
        }
      }
    } catch {
      setError("Failed to load");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, applied]);

  useEffect(() => {
    load();
  }, [load]);

  async function onDelete(id: number) {
    if (!confirm("Delete this search history record?")) return;
    const res = await fetch(`/api/admin/search-history/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) alert(json.message ?? "Delete failed");
    else load();
  }

  function applyFilters() {
    const p = new URLSearchParams();
    if (maxBudget) p.set("maxBudget", maxBudget);
    if (projectType) p.set("projectType", projectType);
    if (duration.length) p.set("duration", duration.join(","));
    if (area.length) p.set("area", area.join(","));
    if (downPayment) p.set("downPayment", downPayment);
    if (slabCasting) p.set("slabCasting", slabCasting);
    if (plinth) p.set("plinth", plinth);
    if (colour) p.set("colour", colour);
    if (monthInstall) p.set("monthInstall", monthInstall);
    if (quarterlyInstall) p.set("quarterlyInstall", quarterlyInstall);
    if (halfYearlyInstall) p.set("halfYearlyInstall", halfYearlyInstall);
    if (yearlyInstall) p.set("yearlyInstall", yearlyInstall);
    if (possession) p.set("possession", possession);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    setApplied(p);
    setPage(1);
  }

  function clearFilters() {
    setMaxBudget("");
    setProjectType("");
    setDuration([]);
    setArea([]);
    setDownPayment("");
    setSlabCasting("");
    setPlinth("");
    setColour("");
    setMonthInstall("");
    setQuarterlyInstall("");
    setHalfYearlyInstall("");
    setYearlyInstall("");
    setPossession("");
    setFrom("");
    setTo("");
    setApplied(new URLSearchParams());
    setPage(1);
  }

  function exportCsv() {
    const params = new URLSearchParams(applied);
    params.set("mode", "housing");
    if (exportFields.length) params.set("fields", exportFields.join(","));
    window.location.href = `/api/admin/export/search-history?${params}`;
  }

  if (error?.includes("Database disabled")) {
    return <AdminDbAlert message={error} />;
  }

  return (
    <div className="space-y-4">
      <AdminPageToolbar total={total} />

      <div className={`${adminCard} relative z-20 overflow-visible`}>
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-800">Housing calculator filters</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Budget (max)</span>
              <Input layout="field"
                type="number"
                min={0}
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Project type</span>
              <AdminSelect
                layout="field"
                value={projectType}
                onChange={setProjectType}
                placeholder="Please select"
                options={[
                  { value: "", label: "Please select" },
                  { value: "Construction", label: "Construction" },
                  { value: "Flat", label: "Flat" },
                ]}
              />
            </label>
            <AdminMultiSelect
              label="Duration"
              options={DURATION_OPTIONS}
              value={duration}
              onChange={setDuration}
              placeholder="All durations"
            />
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Down payment (max)</span>
              <Input layout="field"
                type="number"
                min={0}
                value={downPayment}
                onChange={(e) => setDownPayment(e.target.value)}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Slab casting (max)</span>
              <Input layout="field"
                type="number"
                min={0}
                value={slabCasting}
                onChange={(e) => setSlabCasting(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Plinth (max)</span>
              <Input layout="field"
                type="number"
                min={0}
                value={plinth}
                onChange={(e) => setPlinth(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Colour (max)</span>
              <Input layout="field"
                type="number"
                min={0}
                value={colour}
                onChange={(e) => setColour(e.target.value)}
              />
            </label>
            <AdminMultiSelect
              label="Area"
              options={areaOptions}
              value={area}
              onChange={setArea}
              placeholder="All areas"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Monthly installment (max)</span>
              <Input layout="field"
                type="number"
                min={0}
                value={monthInstall}
                onChange={(e) => setMonthInstall(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Quarterly (max)</span>
              <Input layout="field"
                type="number"
                min={0}
                value={quarterlyInstall}
                onChange={(e) => setQuarterlyInstall(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Half-yearly (max)</span>
              <Input layout="field"
                type="number"
                min={0}
                value={halfYearlyInstall}
                onChange={(e) => setHalfYearlyInstall(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Yearly (max)</span>
              <Input layout="field"
                type="number"
                min={0}
                value={yearlyInstall}
                onChange={(e) => setYearlyInstall(e.target.value)}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Possession (max)</span>
              <Input layout="field"
                type="number"
                min={0}
                value={possession}
                onChange={(e) => setPossession(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Start date</span>
              <Input layout="field"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">End date</span>
              <Input layout="field"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={applyFilters}>
              Search
            </Button>
            <Button type="button" variant="outline" onClick={clearFilters}>
              Reset
            </Button>
          </div>
        </div>
      </div>

      <div className={`${adminCard} p-4`}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <AdminMultiSelect
            label="Export columns"
            options={EXPORT_FIELDS.map((f) => ({ value: f, label: f }))}
            value={exportFields}
            onChange={setExportFields}
            placeholder="All columns"
          />
          <Button type="button" variant="outline" className="gap-1.5" onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {error && !loading && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr>
                <th className={adminTableHead}>#</th>
                <th className={adminTableHead}>Date/Time</th>
                <th className={adminTableHead}>User name</th>
                <th className={adminTableHead}>Phone</th>
                <th className={adminTableHead}>Email</th>
                <th className={adminTableHead}>Area</th>
                <th className={adminTableHead}>Budget</th>
                <th className={adminTableHead}>Project type</th>
                <th className={adminTableHead}>Duration</th>
                <th className={adminTableHead}>Down payment</th>
                <th className={adminTableHead}>Slab</th>
                <th className={adminTableHead}>Plinth</th>
                <th className={adminTableHead}>Colour</th>
                <th className={adminTableHead}>Monthly</th>
                <th className={adminTableHead}>Quarterly</th>
                <th className={adminTableHead}>Half-yearly</th>
                <th className={adminTableHead}>Yearly</th>
                <th className={adminTableHead}>Possession</th>
                <th className={adminTableHead}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={19} className="px-4 py-8"><LoadingState size="sm" inline className="w-full" /></td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={19} className="px-3 py-8 text-center text-zinc-500">
                    No records
                  </td>
                </tr>
              ) : (
                items.map((r) => (
                  <tr key={r.id} className="border-t border-zinc-100">
                    <td className="px-3 py-2">{r.rowNum}</td>
                    <td className="whitespace-nowrap px-3 py-2">{fmtDate(r.createdAt)}</td>
                    <td className="px-3 py-2">{r.userName}</td>
                    <td className="px-3 py-2">{r.phone ?? "—"}</td>
                    <td className="px-3 py-2">{r.email ?? "—"}</td>
                    <td className="px-3 py-2">{joinNames(r.areaNames)}</td>
                    <td className="px-3 py-2">{fmtNum(r.maxBudget)}</td>
                    <td className="px-3 py-2">{r.projectType ?? "—"}</td>
                    <td className="px-3 py-2">
                      {r.duration.length ? `${r.duration.join(", ")} mo` : "—"}
                    </td>
                    <td className="px-3 py-2">{fmtNum(r.downPayment)}</td>
                    <td className="px-3 py-2">{fmtNum(r.slabCasting)}</td>
                    <td className="px-3 py-2">{fmtNum(r.plinth)}</td>
                    <td className="px-3 py-2">{fmtNum(r.colour)}</td>
                    <td className="px-3 py-2">{fmtNum(r.monthInstall)}</td>
                    <td className="px-3 py-2">{fmtNum(r.quarterlyInstall)}</td>
                    <td className="px-3 py-2">{fmtNum(r.halfYearlyInstall)}</td>
                    <td className="px-3 py-2">{fmtNum(r.yearlyInstall)}</td>
                    <td className="px-3 py-2">{fmtNum(r.possession)}</td>
                    <td className="px-3 py-2">
                      <AdminCan module="housing_calc_search" action="delete">
                        <button
                          type="button"
                          onClick={() => void onDelete(r.id)}
                          className="inline-flex rounded p-1.5 text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </AdminCan>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / PER_PAGE))}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => p + 1)}
        />
      </div>
    </div>
  );
}
