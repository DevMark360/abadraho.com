"use client";

import { useEffect, useState } from "react";
import type {
  AnalyticsRange,
  DashboardAnalytics,
} from "@/server/services/admin-analytics.service";
import { BarChart, DualLineChart } from "@/components/admin/mini-chart";

function toChartPoints(points: DashboardAnalytics["points"], showCustomers: boolean) {
  return points.map((p) => ({
    label: p.label,
    value: showCustomers ? p.customers : p.projects,
  }));
}

function toDualPoints(points: DashboardAnalytics["points"]) {
  return points.map((p) => ({ label: p.label, a: p.customers, b: p.projects }));
}

const RANGE_TOGGLE = "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition";
const RANGE_TOGGLE_ACTIVE = "bg-zinc-900 text-white";
const RANGE_TOGGLE_INACTIVE = "text-zinc-500 hover:bg-zinc-100";

export function AdminDashboardAnalytics({ isBuilder }: { isBuilder: boolean }) {
  const [range, setRange] = useState<AnalyticsRange>("month");
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics?range=${range}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.analytics) setData(json.analytics);
      })
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((json) => {
        if (typeof json.stats?.contacts === "number") setContacts(json.stats.contacts);
      })
      .catch(() => {});
  }, []);

  if (isBuilder) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">New projects</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Projects added over time</p>
        {loading || !data ? (
          <p className="mt-6 text-sm text-zinc-400">Loading analytics…</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-1">
              {(["week", "month", "year"] as AnalyticsRange[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`${RANGE_TOGGLE} ${range === r ? RANGE_TOGGLE_ACTIVE : RANGE_TOGGLE_INACTIVE}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {(["week", "month", "year"] as const).map((p) => (
                <div key={p} className="rounded-md border border-zinc-100 bg-zinc-50 px-2 py-2 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-400">{p}</p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900">
                    {data.periodTotals[p].projects}
                  </p>
                  <p className="text-[10px] text-zinc-500">new projects</p>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <BarChart points={toChartPoints(data.points, false)} color="indigo" height={140} />
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Analytics</h2>
          <p className="mt-0.5 text-xs text-zinc-500">New customers and projects over time</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {(["week", "month", "year"] as AnalyticsRange[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`${RANGE_TOGGLE} ${range === r ? RANGE_TOGGLE_ACTIVE : RANGE_TOGGLE_INACTIVE}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <p className="mt-6 text-sm text-zinc-400">Loading analytics…</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-md border border-zinc-100 bg-zinc-50 p-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                New customers
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">
                {data.periodTotals[range === "year" ? "year" : range].customers}
              </p>
              <p className="text-[10px] text-zinc-400">this {range}</p>
            </div>
            <div className="rounded-md border border-zinc-100 bg-zinc-50 p-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                New projects
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">
                {data.periodTotals[range === "year" ? "year" : range].projects}
              </p>
              <p className="text-[10px] text-zinc-400">this {range}</p>
            </div>
            <div className="rounded-md border border-zinc-100 bg-zinc-50 p-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">Contact</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">
                {contacts ?? "—"}
              </p>
              <p className="text-[10px] text-zinc-400">total submissions</p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-4 border-b border-zinc-100 pb-2 text-xs">
            <span className="flex items-center gap-1.5 text-zinc-600">
              <span className="h-2 w-2 rounded-full bg-indigo-600" /> Customers
            </span>
            <span className="flex items-center gap-1.5 text-zinc-600">
              <span className="h-2 w-2 rounded-full bg-zinc-400" /> Projects
            </span>
          </div>

          <div className="mt-2">
            <DualLineChart
              points={toDualPoints(data.points)}
              seriesA={{ label: "Customers", color: "indigo" }}
              seriesB={{ label: "Projects", color: "zinc" }}
              height={160}
            />
          </div>
        </>
      )}
    </div>
  );
}
