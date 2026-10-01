"use client";

import { LoadingState } from "@/components/ui/loading-state";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Building2,
  Calculator,
  Clock,
  Download,
  Eye,
  Home,
  type LucideIcon,
  MapPin,
  Rss,
  SlidersHorizontal,
  Ticket,
  User,
  Wallet,
} from "lucide-react";
import { AdminBackLink, adminCard } from "@/components/admin/admin-ui";
import { fmtDate } from "@/components/admin/admin-search-history-format";
import { cn, formatPrice } from "@/lib/utils";

type Analytics = {
  user: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
  };
  topAreas: { area: string; count: number; percent: number }[];
  budget: { avgMin: number | null; avgMax: number | null };
  timeline: {
    projectId: number | null;
    projectSlug: string | null;
    projectName: string | null;
    lastActivityAt: string;
    events: { createdAt: string; label: string }[];
  }[];
};

const SECTION_LABELS: Record<string, string> = {
  gallery: "Gallery",
  highlights: "Highlights",
  amenities: "Amenities",
  units_and_plans: "Units & plans",
  attachments: "Attachments",
  location_map: "Location map",
  reviews: "Reviews",
  inquiry_form: "Inquiry form",
  payment_schedule: "Payment plan",
};

/** Section names are stored as the raw prop key (e.g. "units_and_plans") — humanize for display. */
function humanizeLabel(label: string): string {
  const match = label.match(/^Viewed (\w+) section$/);
  if (!match) return label;
  return `Viewed ${SECTION_LABELS[match[1]] ?? match[1]}`;
}

type EventVisual = { icon: LucideIcon; className: string };

const EVENT_VISUALS: { pattern: RegExp; icon: LucideIcon; className: string }[] = [
  { pattern: /^Opened /, icon: Home, className: "bg-blue-50 text-blue-600" },
  { pattern: /^Viewed project:/, icon: Home, className: "bg-blue-50 text-blue-600" },
  { pattern: /^Viewed /, icon: Eye, className: "bg-zinc-100 text-zinc-500" },
  { pattern: /^Spent /, icon: Clock, className: "bg-amber-50 text-amber-600" },
  { pattern: /^Generated voucher/, icon: Ticket, className: "bg-emerald-50 text-emerald-600" },
  { pattern: /^Tried to generate voucher/, icon: Ticket, className: "bg-zinc-100 text-zinc-500" },
  { pattern: /^Download PDF/, icon: Download, className: "bg-indigo-50 text-indigo-600" },
  { pattern: /^Searched /, icon: MapPin, className: "bg-blue-50 text-blue-600" },
  { pattern: /^Filtered/, icon: SlidersHorizontal, className: "bg-blue-50 text-blue-600" },
  { pattern: /^Used housing calculator/, icon: Calculator, className: "bg-blue-50 text-blue-600" },
];

function eventVisual(label: string): EventVisual {
  const match = EVENT_VISUALS.find((v) => v.pattern.test(label));
  return match ?? { icon: Rss, className: "bg-zinc-100 text-zinc-500" };
}

function formatBudgetRange(avgMin: number | null, avgMax: number | null) {
  if (avgMin == null && avgMax == null) return "—";
  if (avgMin != null && avgMax != null) {
    return `${formatPrice(avgMin)} – ${formatPrice(avgMax)}`;
  }
  if (avgMin != null) return `From ${formatPrice(avgMin)}`;
  return `Up to ${formatPrice(avgMax)}`;
}

function CardHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b px-4 py-3">
      <Icon className="h-4 w-4 text-zinc-400" />
      <h3 className="text-sm font-semibold text-zinc-800">{title}</h3>
    </div>
  );
}

export function AdminUserSearchAnalyticsClient({ userId }: { userId: number }) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(userId) || userId <= 0) {
      setError("Invalid user");
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/search-history/user/${userId}/analytics`);
        const json = await res.json();
        if (!json.success) {
          setError(json.message ?? "Failed to load analytics");
          setAnalytics(null);
        } else {
          setAnalytics(json.analytics);
        }
      } catch {
        setError("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) {
    return (
      <div className="py-12">
        <LoadingState />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="space-y-4">
        <AdminBackLink href="/admin/search-history">Search history</AdminBackLink>
        <p className="text-sm text-red-600">{error ?? "Not found"}</p>
      </div>
    );
  }

  const topArea = analytics.topAreas[0];
  const contact = [analytics.user.email, analytics.user.phone].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6">
      <AdminBackLink href="/admin/search-history">Search history</AdminBackLink>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={adminCard}>
          <CardHeader icon={User} title="User profile" />
          <div className="space-y-2 p-4 text-sm">
            <p>
              <span className="font-medium text-zinc-700">Name:</span> {analytics.user.name}
            </p>
            <p>
              <span className="font-medium text-zinc-700">Contact:</span>{" "}
              {contact || "—"}
            </p>
          </div>
        </div>

        <div className={adminCard}>
          <CardHeader icon={MapPin} title="Smart insights" />
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <MapPin className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-zinc-500">Target location</p>
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {topArea ? topArea.area : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Wallet className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-zinc-500">Estimated budget</p>
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {formatBudgetRange(analytics.budget.avgMin, analytics.budget.avgMax)}
                </p>
              </div>
            </div>

            {analytics.topAreas.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {analytics.topAreas.map((a) => (
                  <div key={a.area} className="flex items-center gap-2 text-xs">
                    <span className="w-28 shrink-0 truncate text-zinc-600">{a.area}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                      <span
                        className="block h-full rounded-full bg-blue-500"
                        style={{ width: `${a.percent}%` }}
                      />
                    </span>
                    <span className="w-16 shrink-0 text-right text-zinc-500">
                      {a.count} · {a.percent}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Rss className="h-4 w-4 text-zinc-400" />
        <h3 className="text-sm font-semibold text-zinc-800">Live activity feed</h3>
      </div>
      <div className="space-y-4">
        {analytics.timeline.length === 0 ? (
          <div className={adminCard}>
            <p className="py-8 text-center text-sm text-zinc-500">No activity recorded</p>
          </div>
        ) : (
          analytics.timeline.map((group) => (
            <div key={group.projectId ?? "general"} className={adminCard}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-zinc-50/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-600">
                    <Building2 className="h-3.5 w-3.5" />
                  </span>
                  {group.projectSlug ? (
                    <Link
                      href={`/project/${group.projectSlug}`}
                      className="text-sm font-semibold text-zinc-900 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {group.projectName}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-zinc-800">
                      {group.projectName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
                    {group.events.length} event{group.events.length === 1 ? "" : "s"}
                  </span>
                  <span className="text-xs text-zinc-400">last {fmtDate(group.lastActivityAt)}</span>
                </div>
              </div>
              <ul className="divide-y divide-zinc-100 p-2">
                {group.events.map((event, i) => {
                  const label = humanizeLabel(event.label);
                  const { icon: Icon, className } = eventVisual(label);
                  return (
                    <li key={`${event.createdAt}-${i}`} className="flex items-start gap-3 px-2 py-2.5">
                      <span
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                          className
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-zinc-900">{label}</p>
                        <p className="text-xs text-zinc-400">{fmtDate(event.createdAt)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
