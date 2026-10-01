"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  Briefcase,
  Building2,
  FileText,
  LayoutGrid,
  Mail,
  MessageSquare,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import { userTypeIds } from "@/config/site";
import { AdminDashboardAnalytics } from "@/components/admin/admin-dashboard-analytics";
import { AdminAttentionPanel } from "@/components/admin/admin-attention-panel";
import { AdminRecentActivityFeed } from "@/components/admin/admin-recent-activity-feed";
import { AdminCommercialPanel } from "@/components/admin/admin-commercial-panel";
import { AdminActivityHeatmap } from "@/components/admin/admin-activity-heatmap";
import type { StatTrend } from "@/server/services/admin-analytics.service";
import { Sparkline } from "@/components/admin/mini-chart";

type StatCard = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
};

function WeekChangePill({ percent }: { percent: number | null }) {
  if (percent == null || percent === 0) {
    return <span className="text-[11px] text-zinc-300">No change data</span>;
  }
  const up = percent > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
        up ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
      }`}
    >
      {up ? "▲" : "▼"} {Math.abs(percent)}%
    </span>
  );
}

function StatCardLink({
  card,
  value,
  trend,
}: {
  card: StatCard;
  value: number | undefined;
  trend?: StatTrend;
}) {
  const Icon = card.icon;
  const percent = trend?.weekOverWeekPercent ?? null;
  const sparkColor = percent == null || percent === 0 ? "indigo" : percent > 0 ? "emerald" : "red";

  return (
    <Link
      href={card.href as Route}
      className="group flex flex-col justify-between rounded-lg border border-zinc-200 bg-white p-3.5 transition hover:border-zinc-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          {card.label}
        </p>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-50 text-zinc-400 transition group-hover:bg-zinc-100 group-hover:text-zinc-500">
          <Icon className="h-3 w-3" />
        </span>
      </div>

      {value === undefined ? (
        <div className="mt-2 h-6 w-14 animate-pulse rounded bg-zinc-100" />
      ) : (
        <p className="mt-1.5 text-[22px] font-semibold tabular-nums leading-none tracking-tight text-zinc-900">
          {value.toLocaleString()}
        </p>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-zinc-100 pt-2">
        <WeekChangePill percent={percent} />
        {trend && trend.sparkline.some((v) => v > 0) ? (
          <Sparkline values={trend.sparkline} color={sparkColor} width={56} height={18} />
        ) : null}
      </div>
    </Link>
  );
}

export function AdminDashboardClient() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [trends, setTrends] = useState<Record<string, StatTrend>>({});
  const [dbError, setDbError] = useState(false);
  const [userTypeId, setUserTypeId] = useState<number | null>(null);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [greeting, setGreeting] = useState<{ text: string; date: string } | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    const text = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const date = new Date().toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    setGreeting({ text, date });
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch("/api/admin/stats/trends").then((r) => r.json()),
      fetch("/api/admin/auth/me").then((r) => r.json()),
      fetch("/api/v1/auth/me", { credentials: "same-origin" }).then((r) => r.json()),
    ])
      .then(([statsJson, trendsJson, adminJson, userJson]) => {
        if (statsJson.stats && Object.keys(statsJson.stats).length) {
          setStats(statsJson.stats);
        } else {
          setDbError(true);
        }

        if (trendsJson.trends) {
          setTrends(trendsJson.trends);
        }

        const admin = adminJson.admin as
          | { userTypeId?: number; source?: string; name?: string; email?: string }
          | undefined;
        let typeId: number | null = null;
        if (admin?.userTypeId != null) {
          typeId = admin.userTypeId;
        } else if (admin?.source === "admin") {
          typeId = userTypeIds.admin;
        } else if (userJson.user?.userTypeId != null) {
          typeId = userJson.user.userTypeId;
        }
        if (typeId != null) setUserTypeId(typeId);
        setAdminName(admin?.name ?? userJson.user?.firstName ?? null);
      })
      .catch(() => setDbError(true));
  }, []);

  const isBuilder = userTypeId === userTypeIds.builder;

  const cards: StatCard[] = isBuilder
    ? [
        { key: "projects", label: "Projects", href: "/admin/projects", icon: Building2 },
        { key: "units", label: "Units", href: "/admin/units", icon: LayoutGrid },
        { key: "inquiries", label: "Inquiries", href: "/admin/inquiries", icon: MessageSquare },
      ]
    : [
        { key: "projects", label: "Projects", href: "/admin/projects", icon: Building2 },
        { key: "units", label: "Units", href: "/admin/units", icon: LayoutGrid },
        { key: "customers", label: "Customers", href: "/admin/customers", icon: Users },
        { key: "inquiries", label: "Inquiries", href: "/admin/inquiries", icon: MessageSquare },
        { key: "blogs", label: "Blogs", href: "/admin/blogs", icon: FileText },
        { key: "reviews", label: "Reviews", href: "/admin/reviews", icon: Star },
        { key: "contacts", label: "Contact", href: "/admin/contact", icon: Mail },
        { key: "brokers", label: "Brokers", href: "/admin/agents", icon: Briefcase },
      ];

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between border-b border-zinc-200 pb-3">
        <p className="text-sm text-zinc-500">
          {greeting ? (
            <>
              <span className="font-medium text-zinc-700">{greeting.text}</span>
              {adminName ? `, ${adminName}` : ""}
              <span className="mx-2 text-zinc-300">·</span>
              {greeting.date}
            </>
          ) : (
            " "
          )}
        </p>
      </div>

      {isBuilder && (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
          Yeh wahi projects hain jo abadraho.com par dikhenge.
        </p>
      )}

      {dbError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Connect MySQL and set <code>USE_DATABASE=true</code> in <code>.env</code> for live stats
          and CRUD.
        </div>
      )}

      <section>
        <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Overview
        </h2>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <StatCardLink key={c.key} card={c} value={stats[c.key]} trend={trends[c.key]} />
          ))}
        </div>
      </section>

      {!isBuilder && (
        <>
          <section>
            <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Commercial
            </h2>
            <AdminCommercialPanel />
          </section>

          <section>
            <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Operations
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              <AdminAttentionPanel />
              <AdminRecentActivityFeed />
            </div>
          </section>
        </>
      )}

      <section className="space-y-3">
        <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Trends
        </h2>
        <AdminDashboardAnalytics isBuilder={isBuilder} />
        {!isBuilder && <AdminActivityHeatmap />}
      </section>
    </div>
  );
}
