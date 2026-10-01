"use client";

import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  BarChart3,
  Building2,
  ExternalLink,
  FileText,
  Info,
  KeyRound,
  Link2,
  MessageCircle,
  MousePointerClick,
  TrendingUp,
  User,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { useBrokerPortal } from "@/components/broker/broker-portal-context";
import { BrokerGate } from "@/components/broker/broker-gate";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { designTw } from "@/config/design-tokens";
import { clientAbsoluteUrl } from "@/lib/client/absolute-url";
import { cn } from "@/lib/utils";
import { BrokerOpsDashboard } from "@/components/broker/broker-ops-dashboard";
import type { BrokerDashboardData } from "@/server/services/broker-portal.service";

type StatDef = {
  key: keyof BrokerDashboardData["stats"];
  label: string;
  href: string;
  icon: React.ReactNode;
  accent: string;
  iconBg: string;
};

const MARKETING_STATS: StatDef[] = [
  {
    key: "pitchDecks",
    label: "Pitch decks",
    href: "/broker/pitch-decks",
    icon: <FileText className="h-5 w-5 text-violet-700" />,
    accent: "bg-violet-500",
    iconBg: "bg-violet-50",
  },
  {
    key: "whatsappCards",
    label: "WhatsApp cards",
    href: "/broker/whatsapp-cards",
    icon: <MessageCircle className="h-5 w-5 text-emerald-700" />,
    accent: "bg-emerald-500",
    iconBg: "bg-emerald-50",
  },
  {
    key: "shortLinks",
    label: "Short links",
    href: "/broker/analytics",
    icon: <Link2 className="h-5 w-5 text-blue-700" />,
    accent: "bg-blue-500",
    iconBg: "bg-blue-50",
  },
  {
    key: "totalClicks",
    label: "Link clicks",
    href: "/broker/analytics",
    icon: <MousePointerClick className="h-5 w-5 text-cyan-700" />,
    accent: "bg-cyan-500",
    iconBg: "bg-cyan-50",
  },
];

type QuickAction = {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  primary?: boolean;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    href: "/broker/projects",
    label: "All listings",
    desc: "Generate decks, cards & links",
    icon: Building2,
    primary: true,
  },
  { href: "/broker/pitch-decks", label: "Pitch decks", desc: "PDF brochures", icon: FileText },
  {
    href: "/broker/whatsapp-cards",
    label: "WhatsApp cards",
    desc: "Shareable images",
    icon: MessageCircle,
  },
  { href: "/broker/analytics", label: "Analytics", desc: "Clicks & performance", icon: BarChart3 },
];

const ACCOUNT_LINKS = [
  { href: "/account/profile", label: "Profile & contact", icon: User },
  { href: "/account/password", label: "Change password", icon: KeyRound },
] as const;

function StatCardLink({
  stat,
  value,
}: {
  stat: StatDef;
  value: number;
}) {
  return (
    <Link
      href={stat.href as Route}
      className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:shadow-md"
    >
      <div
        className={cn(
          "absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full opacity-[0.08]",
          stat.accent
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{stat.label}</p>
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
          {stat.icon}
        </div>
      </div>
    </Link>
  );
}

export function BrokerHubClient() {
  return (
    <BrokerGate>
      <BrokerHubContent />
    </BrokerGate>
  );
}

function BrokerHubContent() {
  const { dashboard: data } = useBrokerPortal();
  const { user } = useAuth();

  if (!data) {
    return <LoadingState size="sm" label="Loading your workspace…" />;
  }

  const firstName =
    data.broker.contactPersonName?.split(" ")[0] ||
    user?.firstName ||
    "Agent";
  const subtitle = [
    data.broker.contactEmail ?? user?.email,
    data.broker.companyName,
  ]
    .filter(Boolean)
    .join(" · ");

  const hasAssets =
    data.stats.pitchDecks > 0 ||
    data.stats.whatsappCards > 0 ||
    data.stats.shortLinks > 0;

  const recentItems = [
    ...data.recentPitchDecks.map((d) => ({
      id: `deck-${d.id}`,
      type: "Pitch deck" as const,
      projectName: d.projectName,
      projectSlug: d.projectSlug,
      fileUrl: d.fileUrl,
      createdAt: d.createdAt,
    })),
    ...data.recentWhatsappCards.map((c) => ({
      id: `card-${c.id}`,
      type: "WhatsApp card" as const,
      projectName: c.projectName,
      projectSlug: c.projectSlug,
      fileUrl: c.fileUrl,
      createdAt: c.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 px-6 py-8 text-white sm:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Agent workspace
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Welcome back, {firstName}
              </h1>
              <p className="mt-2 text-sm text-zinc-300">
                {subtitle || "Create pitch decks, WhatsApp cards, and short links for off-plan listings"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className={cn(designTw.btnPrimary, "shadow-md")}>
                <Link href="/broker/projects">
                  <Building2 className="mr-2 h-4 w-4" />
                  Browse listings
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-zinc-600 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Link href="/broker/analytics">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View analytics
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {data.brokerToolsReady === false ? (
          <div className="flex items-start gap-3 border-t border-zinc-100 bg-amber-50/80 px-6 py-4 sm:px-8">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <p className="text-sm leading-relaxed text-amber-950">
              Marketing tool tables are not in the database yet. You can browse listings; generate
              pitch decks, WhatsApp cards, and short links after migration is complete.
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-3 border-t border-zinc-100 bg-blue-50/60 px-6 py-4 sm:px-8">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
            <p className="text-sm leading-relaxed text-blue-950">
              Pick any active listing under{" "}
              <Link href="/broker/projects" className="font-medium underline">
                All listings
              </Link>{" "}
              to generate pitch decks, WhatsApp cards, and trackable short links for your
              clients.
            </p>
          </div>
        )}
      </section>

      {/* Stats */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-900">Marketing overview</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {MARKETING_STATS.map((stat) => (
            <StatCardLink key={stat.key} stat={stat} value={data.stats[stat.key]} />
          ))}
        </div>
      </section>

      {data.opsStats ? <BrokerOpsDashboard ops={data.opsStats} /> : null}

      {/* Main grid */}
      <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <section className={cn(designTw.publicCard, "overflow-hidden")}>
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-zinc-900">Recent assets</h2>
                <p className="mt-0.5 text-xs text-zinc-500">Latest pitch decks and WhatsApp cards</p>
              </div>
              <Link
                href="/broker/pitch-decks"
                className="inline-flex items-center gap-1 text-sm font-medium text-zinc-700 hover:text-zinc-900"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {!hasAssets || recentItems.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-14 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
                  <FileText className="h-7 w-7 text-zinc-400" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-zinc-900">No marketing assets yet</h3>
                <p className="mt-2 max-w-sm text-sm text-zinc-500">
                  Choose a listing and generate a pitch deck, WhatsApp card, or short link to share
                  with buyers.
                </p>
                <Button asChild className={cn("mt-6", designTw.btnPrimary)}>
                  <Link href="/broker/projects">
                    <Building2 className="mr-2 h-4 w-4" />
                    Open all listings
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {recentItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-zinc-50/80"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-900">{item.projectName}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {item.type} ·{" "}
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.projectSlug && (
                        <Link
                          href={`/project/${item.projectSlug}`}
                          className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-white hover:ring-zinc-300"
                        >
                          Listing
                        </Link>
                      )}
                      {item.fileUrl ? (
                        <a
                          href={item.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-800"
                        >
                          Open
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={cn(designTw.publicCard, "overflow-hidden")}>
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-zinc-900">Top short links</h2>
                <p className="mt-0.5 text-xs text-zinc-500">Most clicked tracked links</p>
              </div>
              <Link
                href="/broker/analytics"
                className="inline-flex items-center gap-1 text-sm font-medium text-zinc-700 hover:text-zinc-900"
              >
                Analytics
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {!data.topLinks.length ? (
              <p className="px-5 py-8 text-sm text-zinc-500">
                Create short links from{" "}
                <Link href="/broker/projects" className="font-medium text-zinc-700 underline">
                  All listings
                </Link>{" "}
                to track clicks here.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {data.topLinks.map((link) => (
                  <li
                    key={link.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-zinc-50/80"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-900">{link.projectName}</p>
                      <p className="mt-0.5 truncate font-mono text-xs text-zinc-500">
                        /p/{link.projectSlug}/{link.shortCode}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-medium text-cyan-800 ring-1 ring-inset ring-cyan-600/20">
                        {link.clicks.toLocaleString()} clicks
                      </span>
                      {link.shortPath ? (
                        <a
                          href={clientAbsoluteUrl(link.shortPath)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-white hover:ring-zinc-300"
                        >
                          Open
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className={cn(designTw.publicCard, "p-5")}>
            <h2 className="text-sm font-semibold text-zinc-900">Quick actions</h2>
            <ul className="mt-3 space-y-1">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <li key={action.href}>
                    <Link
                      href={action.href as Route}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 transition",
                        action.primary
                          ? "bg-zinc-900 text-white hover:bg-zinc-800"
                          : "hover:bg-zinc-50"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                          action.primary ? "bg-white/10" : "bg-zinc-100"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4",
                            action.primary ? "text-white" : "text-zinc-700"
                          )}
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{action.label}</span>
                        <span
                          className={cn(
                            "block truncate text-xs",
                            action.primary ? "text-zinc-300" : "text-zinc-500"
                          )}
                        >
                          {action.desc}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={cn(designTw.publicCard, "p-5")}>
            <h2 className="text-sm font-semibold text-zinc-900">Your account</h2>
            <ul className="mt-3 space-y-1">
              {ACCOUNT_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href as Route}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-zinc-50"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                        <Icon className="h-4 w-4 text-zinc-700" />
                      </span>
                      <span className="text-sm font-medium text-zinc-800">{link.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={cn(designTw.publicCard, "p-5")}>
            <h2 className="text-sm font-semibold text-zinc-900">Browse platform</h2>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              Explore live off-plan projects on the public site to preview what buyers see.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-700 hover:text-zinc-900"
            >
              Browse all projects
              <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
