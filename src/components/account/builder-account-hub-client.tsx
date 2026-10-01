"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Route } from "next";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Eye,
  Inbox,
  KeyRound,
  LayoutGrid,
  Plus,
  Star,
  Ticket,
  TrendingUp,
  User,
  UserCog,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
  Users,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";
import { PROJECT_STATUS_LABELS } from "@/config/project-status";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";
import type { BuilderAccountSummary } from "@/server/services/builder-account.service";
import type { AuthUser } from "@/components/auth/auth-provider";
import { userDisplayName } from "@/components/auth/auth-provider";

type StatDef = {
  key: keyof Pick<
    BuilderAccountSummary,
    "live" | "onHold" | "rejected" | "totalProjects" | "units" | "inquiries" | "totalViews"
  >;
  label: string;
  href: string;
  icon: React.ReactNode;
  accent: string;
  iconBg: string;
};

const PROJECT_STATS: StatDef[] = [
  {
    key: "live",
    label: "Live projects",
    href: "/admin/projects/active",
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-700" />,
    accent: "bg-emerald-500",
    iconBg: "bg-emerald-50",
  },
  {
    key: "onHold",
    label: "Pending review",
    href: "/admin/projects/pending",
    icon: <Clock className="h-5 w-5 text-amber-700" />,
    accent: "bg-amber-500",
    iconBg: "bg-amber-50",
  },
  {
    key: "rejected",
    label: "Rejected",
    href: "/admin/projects",
    icon: <XCircle className="h-5 w-5 text-red-700" />,
    accent: "bg-red-500",
    iconBg: "bg-red-50",
  },
  {
    key: "totalProjects",
    label: "Total projects",
    href: "/admin/projects",
    icon: <Building2 className="h-5 w-5 text-zinc-700" />,
    accent: "bg-zinc-800",
    iconBg: "bg-zinc-100",
  },
];

const ENGAGEMENT_STATS: StatDef[] = [
  {
    key: "units",
    label: "Units",
    href: "/admin/units",
    icon: <LayoutGrid className="h-5 w-5 text-blue-700" />,
    accent: "bg-blue-500",
    iconBg: "bg-blue-50",
  },
  {
    key: "inquiries",
    label: "Inquiries",
    href: "/admin/inquiries",
    icon: <Inbox className="h-5 w-5 text-violet-700" />,
    accent: "bg-violet-500",
    iconBg: "bg-violet-50",
  },
  {
    key: "totalViews",
    label: "Total views",
    href: "/admin/projects",
    icon: <Eye className="h-5 w-5 text-cyan-700" />,
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
  { href: "/admin/projects/create", label: "Add project", desc: "Submit a new listing", icon: Plus, primary: true },
  { href: "/advertising", label: "Advertising", desc: "Promote your projects", icon: Megaphone },
  { href: "/admin/projects", label: "My projects", desc: "Manage all listings", icon: Building2 },
  { href: "/admin/units", label: "Units", desc: "Floor plans & pricing", icon: LayoutGrid },
  { href: "/admin/inquiries", label: "Inquiries", desc: "Buyer leads", icon: Inbox },
  { href: "/admin/events", label: "Events", desc: "Launches & open houses", icon: CalendarDays },
  { href: "/admin/my-teams", label: "Teams", desc: "Collaborate on projects", icon: Users },
  { href: "/admin/reviews", label: "Reviews", desc: "Project feedback", icon: Star },
  { href: "/admin/vouchers", label: "Vouchers", desc: "Promo codes", icon: Ticket },
  { href: "/admin/admin-profile", label: "Workspace profile", desc: "Builder details", icon: UserCog },
];

const ACCOUNT_LINKS = [
  { href: "/account/profile", label: "Profile & contact", icon: User },
  { href: "/account/password", label: "Change password", icon: KeyRound },
] as const;

function statusBadgeClass(status: number): string {
  if (status === 1) return "bg-emerald-50 text-emerald-800 ring-emerald-600/20";
  if (status === 3) return "bg-red-50 text-red-800 ring-red-600/20";
  return "bg-amber-50 text-amber-900 ring-amber-600/20";
}

function StatCardLink({ stat, value }: { stat: StatDef; value: number }) {
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

export function BuilderAccountHubClient({ user }: { user: AuthUser }) {
  const [summary, setSummary] = useState<BuilderAccountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/account/builder-summary", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) {
          setError(j.message ?? "Failed to load builder summary");
          return;
        }
        setSummary(j.summary ?? null);
      })
      .catch(() => setError("Failed to load builder summary"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState size="sm" label="Loading your workspace…" />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        {error}
      </div>
    );
  }

  if (!summary) return null;

  const displayName = userDisplayName(user);
  const hasProjects = summary.totalProjects > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 px-6 py-8 text-white sm:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Builder workspace
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Welcome back, {displayName.split(" ")[0] || "Builder"}
              </h1>
              <p className="mt-2 text-sm text-zinc-300">
                {user.email ?? "Manage your off-plan listings on AbadRaho"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className={cn(designTw.btnPrimary, "shadow-md")}>
                <Link href="/admin/projects/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Add project
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-zinc-600 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Link href="/admin/projects">Manage projects</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-zinc-600 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Link href="/admin/events/create">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Add event
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-zinc-600 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Link href="/advertising">
                  <Megaphone className="mr-2 h-4 w-4" />
                  Advertising
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 border-t border-zinc-100 bg-amber-50/80 px-6 py-4 sm:px-8">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <p className="text-sm leading-relaxed text-amber-950">
            New projects are submitted for admin review and appear on the website only after
            approval. Edits to live projects may return them to pending review.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-900">Overview</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PROJECT_STATS.map((stat) => (
            <StatCardLink key={stat.key} stat={stat} value={summary[stat.key]} />
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {ENGAGEMENT_STATS.map((stat) => (
            <StatCardLink key={stat.key} stat={stat} value={summary[stat.key]} />
          ))}
        </div>
      </section>

      {/* Main grid: projects + sidebar actions */}
      <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
        <section className={cn(designTw.publicCard, "overflow-hidden")}>
          <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
            <div>
              <h2 className="font-semibold text-zinc-900">Recent projects</h2>
              <p className="mt-0.5 text-xs text-zinc-500">Latest updates across your portfolio</p>
            </div>
            <Link
              href="/admin/projects"
              className="inline-flex items-center gap-1 text-sm font-medium text-zinc-700 hover:text-zinc-900"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {!hasProjects ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100">
                <Building2 className="h-7 w-7 text-zinc-400" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-900">No projects yet</h3>
              <p className="mt-2 max-w-sm text-sm text-zinc-500">
                Create your first off-plan listing to start receiving inquiries from buyers on
                AbadRaho.
              </p>
              <Button asChild className={cn("mt-6", designTw.btnPrimary)}>
                <Link href="/admin/projects/create">
                  <Plus className="mr-2 h-4 w-4" />
                  Add your first project
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {summary.recentProjects.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-zinc-50/80"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900">{p.name}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Updated {new Date(p.updatedAt).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                        statusBadgeClass(p.status)
                      )}
                    >
                      {PROJECT_STATUS_LABELS[p.status] ?? p.statusLabel}
                    </span>
                    <Link
                      href={`/admin/projects/${p.id}/edit`}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-white hover:ring-zinc-300"
                    >
                      Edit
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
                        <Icon className={cn("h-4 w-4", action.primary ? "text-white" : "text-zinc-700")} />
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
        </aside>
      </div>
    </div>
  );
}
