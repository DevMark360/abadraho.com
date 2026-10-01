"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ExternalLink,
  FileText,
  Link2,
  MessageCircle,
  MousePointerClick,
} from "lucide-react";
import { BrokerGate } from "@/components/broker/broker-gate";
import {
  BrokerEmptyState,
  BrokerSubpageShell,
  brokerPageIcon,
} from "@/components/broker/broker-subpage-shell";
import { LoadingState } from "@/components/ui/loading-state";
import { designTw } from "@/config/design-tokens";
import { clientAbsoluteUrl } from "@/lib/client/absolute-url";
import { cn } from "@/lib/utils";

type Analytics = {
  pitchDecks: Array<{ projectName: string; fileUrl: string | null; createdAt: string }>;
  shortLinks: Array<{ projectName: string; shortPath?: string; shortUrl: string; clicks: number; createdAt: string }>;
  whatsappCards: Array<{ projectName: string; fileUrl: string | null; createdAt: string }>;
};

const SUMMARY_STATS = [
  {
    key: "clicks" as const,
    label: "Total clicks",
    icon: MousePointerClick,
    accent: "bg-cyan-500",
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-700",
  },
  {
    key: "shortLinks" as const,
    label: "Short links",
    icon: Link2,
    accent: "bg-blue-500",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-700",
  },
  {
    key: "pitchDecks" as const,
    label: "Pitch decks",
    icon: FileText,
    accent: "bg-violet-500",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-700",
  },
  {
    key: "whatsappCards" as const,
    label: "WhatsApp cards",
    icon: MessageCircle,
    accent: "bg-emerald-500",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-700",
  },
];

export function BrokerAnalyticsClient() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/broker/analytics", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && j.analytics) setData(j.analytics);
      })
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    if (!data) return null;
    return {
      clicks: data.shortLinks.reduce((s, l) => s + l.clicks, 0),
      shortLinks: data.shortLinks.length,
      pitchDecks: data.pitchDecks.length,
      whatsappCards: data.whatsappCards.length,
    };
  }, [data]);

  const hasAnyData =
    data &&
    (data.shortLinks.length > 0 || data.pitchDecks.length > 0 || data.whatsappCards.length > 0);

  return (
    <BrokerGate>
      <BrokerSubpageShell
        title="Analytics"
        description="Track short-link clicks and review all marketing assets you've created across listings."
        icon={brokerPageIcon(BarChart3, "text-blue-700")}
        iconBgClassName="bg-blue-50"
      >
        {loading ? (
          <LoadingState size="sm" label="Loading analytics…" />
        ) : !data || !summary ? (
          <BrokerEmptyState
            icon={BarChart3}
            title="No analytics data"
            description="Create short links and marketing assets from All listings to see performance here."
            actionHref="/broker/projects"
            actionLabel="Open All listings"
          />
        ) : !hasAnyData ? (
          <BrokerEmptyState
            icon={BarChart3}
            title="Nothing to report yet"
            description="Generate pitch decks, WhatsApp cards, or short links to populate your analytics."
            actionHref="/broker/projects"
            actionLabel="Create marketing assets"
          />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {SUMMARY_STATS.map((stat) => {
                const Icon = stat.icon;
                const value = summary[stat.key];
                return (
                  <div
                    key={stat.key}
                    className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm"
                  >
                    <div
                      className={cn(
                        "absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full opacity-[0.08]",
                        stat.accent
                      )}
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                          {stat.label}
                        </p>
                        <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
                          {value.toLocaleString()}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                          stat.iconBg
                        )}
                      >
                        <Icon className={cn("h-5 w-5", stat.iconColor)} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <AnalyticsSection
              title="Short links"
              subtitle="Tracked URLs shared with clients"
              icon={Link2}
              iconBg="bg-blue-50"
              iconColor="text-blue-700"
              empty="No short links created yet."
            >
              {data.shortLinks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/80 text-xs uppercase tracking-wide text-zinc-500">
                        <th className="px-5 py-3 font-semibold">Project</th>
                        <th className="px-5 py-3 font-semibold">URL</th>
                        <th className="px-5 py-3 font-semibold">Clicks</th>
                        <th className="px-5 py-3 font-semibold">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {data.shortLinks.map((row, i) => (
                        <tr key={i} className="transition hover:bg-zinc-50/60">
                          <td className="px-5 py-3.5 font-medium text-zinc-900">{row.projectName}</td>
                          <td className="max-w-xs truncate px-5 py-3.5">
                            <a
                              href={clientAbsoluteUrl(row.shortPath ?? row.shortUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
                            >
                              <span className="truncate">
                                {clientAbsoluteUrl(row.shortPath ?? row.shortUrl)}
                              </span>
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                            </a>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-medium text-cyan-800 ring-1 ring-inset ring-cyan-600/20">
                              {row.clicks.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-zinc-500">
                            {new Date(row.createdAt).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </AnalyticsSection>

            <div className="grid gap-6 lg:grid-cols-2">
              <AnalyticsSection
                title="Pitch decks"
                subtitle="Generated or uploaded PDFs"
                icon={FileText}
                iconBg="bg-violet-50"
                iconColor="text-violet-700"
                empty="No pitch decks yet."
              >
                {data.pitchDecks.length > 0 ? (
                  <AssetRows
                    rows={data.pitchDecks.map((r) => ({
                      name: r.projectName,
                      date: r.createdAt,
                      href: r.fileUrl,
                    }))}
                  />
                ) : null}
              </AnalyticsSection>

              <AnalyticsSection
                title="WhatsApp cards"
                subtitle="Images ready to share"
                icon={MessageCircle}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-700"
                empty="No WhatsApp cards yet."
              >
                {data.whatsappCards.length > 0 ? (
                  <AssetRows
                    rows={data.whatsappCards.map((r) => ({
                      name: r.projectName,
                      date: r.createdAt,
                      href: r.fileUrl,
                    }))}
                  />
                ) : null}
              </AnalyticsSection>
            </div>

            <p className="text-center text-sm text-zinc-500">
              Need more assets?{" "}
              <Link href="/broker/projects" className="font-medium text-zinc-700 underline">
                Manage from All listings
              </Link>
            </p>
          </div>
        )}
      </BrokerSubpageShell>
    </BrokerGate>
  );
}

function AnalyticsSection({
  title,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  empty,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof BarChart3;
  iconBg: string;
  iconColor: string;
  empty: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={cn(designTw.publicCard, "overflow-hidden")}>
      <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", iconBg)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
        <div>
          <h2 className="font-semibold text-zinc-900">{title}</h2>
          <p className="text-xs text-zinc-500">{subtitle}</p>
        </div>
      </div>
      {children ?? <p className="px-5 py-8 text-sm text-zinc-500">{empty}</p>}
    </section>
  );
}

function AssetRows({
  rows,
}: {
  rows: Array<{ name: string; date: string; href: string | null }>;
}) {
  return (
    <ul className="divide-y divide-zinc-100">
      {rows.map((row, i) => (
        <li
          key={i}
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-zinc-50/60"
        >
          <div>
            <p className="font-medium text-zinc-900">{row.name}</p>
            <p className="text-xs text-zinc-500">
              {new Date(row.date).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          {row.href ? (
            <a
              href={row.href}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline"
            >
              Open
            </a>
          ) : (
            <span className="text-xs text-zinc-400">No file</span>
          )}
        </li>
      ))}
    </ul>
  );
}
