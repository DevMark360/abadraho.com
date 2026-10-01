"use client";

import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  Building2,
  Receipt,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { formatCommissionRate } from "@/config/broker-agent";
import type { BrokerDashboardData } from "@/server/services/broker-portal.service";

export function BrokerOpsDashboard({ ops }: { ops: NonNullable<BrokerDashboardData["opsStats"]> }) {
  const statCards = [
    {
      label: "Commission this month",
      value: formatPrice(ops.commissionThisMonth, "PKR"),
      sub:
        ops.commissionMonthChangePct >= 0
          ? `+${ops.commissionMonthChangePct}% vs last month`
          : `${ops.commissionMonthChangePct}% vs last month`,
    },
    {
      label: "Assigned projects",
      value: String(ops.assignedProjects),
      sub: `${ops.assignedAreas} areas`,
    },
    {
      label: "Active leads",
      value: String(ops.activeLeads),
      sub: `${ops.followUpPending} follow-up pending`,
      warn: ops.followUpPending > 0,
    },
    {
      label: "Deals closed",
      value: String(ops.dealsClosedThisMonth),
      sub: `All time: ${ops.dealsClosedAllTime}`,
    },
  ];

  const quickActions = [
    { href: "/broker/projects", label: "My projects", icon: Building2 },
    { href: "/broker/browse", label: "Browse by area", icon: Search },
    { href: "/broker/commissions", label: "My performance", icon: TrendingUp },
    { href: "/broker/leads", label: "My leads", icon: Users },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-zinc-900">My stats</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((c) => (
            <div
              key={c.label}
              className={`rounded-2xl border bg-white p-5 shadow-sm ${
                c.warn ? "border-amber-200 bg-amber-50/40" : "border-zinc-200"
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{c.label}</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-900">{c.value}</p>
              <p className="mt-1 text-xs text-zinc-500">{c.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {ops.pendingCommission > 0 ? (
        <Link
          href="/broker/commissions"
          className="flex flex-col gap-3 rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-semibold text-blue-900">Pending commission</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">
              {formatPrice(ops.pendingCommission, "PKR")}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {ops.pendingDeals} deal{ops.pendingDeals === 1 ? "" : "s"} awaiting confirmation
            </p>
          </div>
          <span className="inline-flex items-center text-sm font-semibold text-blue-700">
            Commission tracker <ArrowRight className="ml-1 h-4 w-4" />
          </span>
        </Link>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold text-zinc-900">Quick actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
            <Link
              key={a.href}
              href={a.href as Route}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-300"
            >
              <Icon className="h-5 w-5 text-brand-accent" />
              {a.label}
            </Link>
            );
          })}
        </div>
      </section>

      {ops.topAssignments.length > 0 ? (
        <section>
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-lg font-semibold text-zinc-900">My assigned projects</h2>
            <Link href="/broker/projects" className="text-sm font-semibold text-brand-accent hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {ops.topAssignments.map((p) => (
              <div key={p.projectId} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <p className="font-semibold text-zinc-900">{p.projectName}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {[p.areaName, p.builderName].filter(Boolean).join(" · ")}
                </p>
                <span className="mt-3 inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  {formatCommissionRate(
                    p.commissionType as "percentage" | "fixed",
                    p.commissionValue
                  )}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {ops.recentActivity.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold text-zinc-900">Recent activity</h2>
          <ul className="mt-4 divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
            {ops.recentActivity.map((ev, i) => (
              <li key={`${ev.at}-${i}`} className="flex gap-3 px-4 py-3 text-sm">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    ev.color === "green"
                      ? "bg-emerald-500"
                      : ev.color === "orange"
                        ? "bg-amber-500"
                        : "bg-blue-500"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-zinc-800">{ev.text}</p>
                  <p className="text-xs text-zinc-400">
                    {new Date(ev.at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
