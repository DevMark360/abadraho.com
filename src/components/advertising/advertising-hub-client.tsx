"use client";

import Link from "next/link";
import type { Route } from "next";
import {
  ArrowLeft,
  ArrowRight,
  Megaphone,
  Plus,
  Wallet,
  MessageCircle,
  Clock,
  CheckCircle2,
  ListChecks,
  Eye,
  MousePointerClick,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { useAdvertisingPortal } from "@/components/advertising/advertising-portal-context";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700 ring-zinc-600/10",
  submitted: "bg-amber-50 text-amber-800 ring-amber-600/20",
  approved: "bg-blue-50 text-blue-800 ring-blue-600/20",
  live: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  paused: "bg-zinc-100 text-zinc-700 ring-zinc-600/10",
  rejected: "bg-red-50 text-red-800 ring-red-600/20",
  completed: "bg-zinc-100 text-zinc-700 ring-zinc-600/10",
  archived: "bg-zinc-200 text-zinc-600 ring-zinc-600/10",
};

const PLACEMENT_LABELS: Record<string, string> = {
  featured_listing: "Featured listing",
  banner: "Banner",
  sponsored_content: "Sponsored content",
};

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  iconBg,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
      <div
        className={cn(
          "absolute right-0 top-0 h-24 w-24 translate-x-6 -translate-y-6 rounded-full opacity-[0.08]",
          accent
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">{value}</p>
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", iconBg)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function AdvertisingHubClient() {
  return <AdvertisingHubContent />;
}

function AdvertisingHubContent() {
  const { dashboard: data } = useAdvertisingPortal();
  const { user } = useAuth();

  if (!data) {
    return <LoadingState size="sm" label="Loading your workspace…" />;
  }

  const firstName = user?.firstName || "Builder";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <Link
        href="/account"
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to my account
      </Link>

      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 px-6 py-8 text-white sm:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Advertising workspace
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Welcome back, {firstName}
              </h1>
              <p className="mt-2 text-sm text-zinc-300">
                Promote your projects with featured listings and banner campaigns.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className={cn(designTw.btnPrimary, "shadow-md")}>
                <Link href="/advertising/campaigns/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New campaign
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-zinc-600 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Link href="/advertising/wallet">
                  <Wallet className="mr-2 h-4 w-4" />
                  Wallet
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-zinc-600 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Link href="/advertising/whatsapp">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp cards
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-900">Overview</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Wallet balance"
            value={`Rs. ${data.wallet.balance.toLocaleString()}`}
            icon={Wallet}
            accent="bg-emerald-500"
            iconBg="bg-emerald-50 text-emerald-700"
          />
          <StatCard
            label="Total campaigns"
            value={data.stats.totalCampaigns.toLocaleString()}
            icon={ListChecks}
            accent="bg-violet-500"
            iconBg="bg-violet-50 text-violet-700"
          />
          <StatCard
            label="Pending review"
            value={data.stats.pendingReview.toLocaleString()}
            icon={Clock}
            accent="bg-amber-500"
            iconBg="bg-amber-50 text-amber-700"
          />
          <StatCard
            label="Active"
            value={data.stats.active.toLocaleString()}
            icon={CheckCircle2}
            accent="bg-blue-500"
            iconBg="bg-blue-50 text-blue-700"
          />
        </div>
      </section>

      {/* Performance */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-900">Performance</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Impressions"
            value={data.stats.totalImpressions.toLocaleString()}
            icon={Eye}
            accent="bg-cyan-500"
            iconBg="bg-cyan-50 text-cyan-700"
          />
          <StatCard
            label="Clicks"
            value={data.stats.totalClicks.toLocaleString()}
            icon={MousePointerClick}
            accent="bg-indigo-500"
            iconBg="bg-indigo-50 text-indigo-700"
          />
          <StatCard
            label="CTR"
            value={`${(data.stats.ctr * 100).toFixed(2)}%`}
            icon={TrendingUp}
            accent="bg-rose-500"
            iconBg="bg-rose-50 text-rose-700"
          />
          <StatCard
            label="Total spend"
            value={`Rs. ${data.stats.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            icon={Wallet}
            accent="bg-amber-500"
            iconBg="bg-amber-50 text-amber-700"
          />
        </div>
      </section>

      {/* Main grid */}
      <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
        <section className={cn(designTw.publicCard, "overflow-hidden")}>
          <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-zinc-900">Recent campaigns</h2>
              <p className="mt-0.5 text-xs text-zinc-500">Your latest ad campaigns</p>
            </div>
            <Link
              href="/advertising/campaigns"
              className="inline-flex items-center gap-1 text-sm font-medium text-zinc-700 hover:text-zinc-900"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {data.recentCampaigns.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
                <Megaphone className="h-7 w-7 text-zinc-400" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-900">No campaigns yet</h3>
              <p className="mt-2 max-w-sm text-sm text-zinc-500">
                Create a campaign to promote one of your projects with a featured listing or
                banner ad.
              </p>
              <Button asChild className={cn("mt-6", designTw.btnPrimary)}>
                <Link href="/advertising/campaigns/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New campaign
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {data.recentCampaigns.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-zinc-50/80"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900">{c.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {c.projectName} · {PLACEMENT_LABELS[c.placementType] ?? c.placementType}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400">
                      {c.impressions.toLocaleString()} impressions · {c.clicks.toLocaleString()} clicks
                      · Rs. {c.spend.toLocaleString(undefined, { maximumFractionDigits: 2 })} spent
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                        c.isArchive ? STATUS_BADGE.archived : (STATUS_BADGE[c.status] ?? STATUS_BADGE.draft)
                      )}
                    >
                      {c.isArchive ? "archived" : c.status}
                    </span>
                    <Link
                      href={`/advertising/campaigns/${c.id}` as Route}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-white hover:ring-zinc-300"
                    >
                      View
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-6">
          <section className={cn(designTw.publicCard, "p-5")}>
            <h2 className="text-sm font-semibold text-zinc-900">Quick actions</h2>
            <ul className="mt-3 space-y-1">
              <li>
                <Link
                  href="/advertising/campaigns/new"
                  className="flex items-center gap-3 rounded-xl bg-zinc-900 px-3 py-2.5 text-white transition hover:bg-zinc-800"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <Plus className="h-4 w-4 text-white" />
                  </span>
                  <span className="block text-sm font-medium">New campaign</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/advertising/campaigns"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-zinc-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                    <ListChecks className="h-4 w-4 text-zinc-700" />
                  </span>
                  <span className="block text-sm font-medium text-zinc-800">All campaigns</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/advertising/wallet"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-zinc-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                    <Wallet className="h-4 w-4 text-zinc-700" />
                  </span>
                  <span className="block text-sm font-medium text-zinc-800">Wallet</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/advertising/whatsapp"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-zinc-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                    <MessageCircle className="h-4 w-4 text-zinc-700" />
                  </span>
                  <span className="block text-sm font-medium text-zinc-800">WhatsApp cards</span>
                </Link>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
