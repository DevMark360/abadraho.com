"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { DonutChart, SmoothAreaChart, SpendGauge } from "@/components/admin/mini-chart";

type CommercialSnapshot = {
  adSpendThisMonth: number;
  activeCampaigns: number;
  walletBalance: number;
  brokerCommissionsThisMonth: number;
  liveCampaignBudget: number;
  campaignStatus: { active: number; paused: number; scheduled: number };
};

const LEGEND: { key: keyof CommercialSnapshot["campaignStatus"]; label: string; color: string; dot: string }[] = [
  { key: "active", label: "Active", color: "text-zinc-600", dot: "bg-indigo-600" },
  { key: "paused", label: "Paused", color: "text-zinc-600", dot: "bg-amber-500" },
  { key: "scheduled", label: "Scheduled", color: "text-zinc-600", dot: "bg-zinc-300" },
];

export function AdminCommercialPanel() {
  const [snapshot, setSnapshot] = useState<CommercialSnapshot | null>(null);
  const [spendTrend, setSpendTrend] = useState<{ label: string; value: number }[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/commercial")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSnapshot(json.snapshot);
      })
      .catch(() => setSnapshot(null));

    fetch("/api/admin/commercial/spend-trend")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSpendTrend(json.points);
      })
      .catch(() => setSpendTrend([]));
  }, []);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Link
          href="/admin/ad-wallet-transactions"
          className="rounded-clay border border-white/80 bg-clay-surface p-3.5 shadow-clay-sm transition-shadow hover:shadow-clay"
        >
          <p className="text-[11px] text-zinc-400">Builder wallet balance</p>
          {snapshot == null ? (
            <div className="mt-1.5 h-6 w-20 animate-pulse rounded bg-zinc-100" />
          ) : (
            <p className="mt-0.5 text-lg font-bold tabular-nums tracking-tight text-emerald-600">
              {formatPrice(snapshot.walletBalance)}
            </p>
          )}
          <p className="mt-2.5 text-[11px] text-zinc-400">Ad spend this month</p>
          {snapshot == null ? (
            <div className="mt-1.5 h-5 w-16 animate-pulse rounded bg-zinc-100" />
          ) : (
            <p className="mt-0.5 text-sm font-semibold tabular-nums tracking-tight text-indigo-700">
              {formatPrice(snapshot.adSpendThisMonth)}
            </p>
          )}
        </Link>

        <Link
          href="/admin/ad-campaigns"
          className="rounded-clay border border-white/80 bg-clay-surface p-3.5 shadow-clay-sm transition-shadow hover:shadow-clay"
        >
          <p className="text-[11px] text-zinc-400">Campaign distribution</p>
          <div className="mt-1.5 flex items-center gap-3">
            <DonutChart
              size={72}
              thickness={10}
              segments={
                snapshot
                  ? [
                      { label: "Active", value: snapshot.campaignStatus.active, color: "indigo" },
                      { label: "Paused", value: snapshot.campaignStatus.paused, color: "amber" },
                      { label: "Scheduled", value: snapshot.campaignStatus.scheduled, color: "zinc" },
                    ]
                  : []
              }
            />
            <ul className="space-y-1 text-[11px]">
              {LEGEND.map((l) => (
                <li key={l.key} className="flex items-center gap-1.5 text-zinc-500">
                  <span className={`h-1.5 w-1.5 rounded-full ${l.dot}`} />
                  {l.label}
                  <span className="font-semibold tabular-nums text-zinc-800">
                    {snapshot ? snapshot.campaignStatus[l.key] : "—"}
                  </span>
                </li>
              ))}
            </ul>
            {snapshot && snapshot.liveCampaignBudget > 0 && (
              <SpendGauge
                size={72}
                current={snapshot.adSpendThisMonth}
                goal={snapshot.liveCampaignBudget}
                formatValue={(v) => formatPrice(v)}
              />
            )}
          </div>
        </Link>

        <Link
          href="/admin/commissions"
          className="rounded-clay border border-white/80 bg-clay-surface p-3.5 shadow-clay-sm transition-shadow hover:shadow-clay"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-zinc-400">Broker commissions this month</p>
            <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium text-zinc-500">
              this month
            </span>
          </div>
          {snapshot == null ? (
            <div className="mt-1.5 h-6 w-20 animate-pulse rounded bg-zinc-100" />
          ) : (
            <p className="mt-0.5 text-lg font-bold tabular-nums tracking-tight text-zinc-900">
              {formatPrice(snapshot.brokerCommissionsThisMonth)}
            </p>
          )}
        </Link>
      </div>

      <div className="rounded-clay border border-white/80 bg-clay-surface shadow-clay-sm p-4">
        <h3 className="text-xs font-semibold text-zinc-900">Ad spend, last 30 days</h3>
        <p className="mt-0.5 text-[11px] text-zinc-400">Daily spend across all campaigns — hover for a day&apos;s value</p>
        <div className="mt-2">
          {spendTrend === null ? (
            <div className="h-32 animate-pulse rounded bg-zinc-50" />
          ) : (
            <SmoothAreaChart points={spendTrend} color="indigo" height={160} formatValue={(v) => formatPrice(v)} />
          )}
        </div>
      </div>
    </div>
  );
}
