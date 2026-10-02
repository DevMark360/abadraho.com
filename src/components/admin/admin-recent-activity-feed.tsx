"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Building2, MessageSquare, Star, UserPlus, type LucideIcon } from "lucide-react";

type RecentActivityItem = {
  key: string;
  type: "signup" | "inquiry" | "review" | "project";
  label: string;
  createdAt: string;
  href: string;
};

const TYPE_ICONS: Record<RecentActivityItem["type"], LucideIcon> = {
  signup: UserPlus,
  inquiry: MessageSquare,
  review: Star,
  project: Building2,
};

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function AdminRecentActivityFeed() {
  const [items, setItems] = useState<RecentActivityItem[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/recent-activity")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setItems(json.items);
      })
      .catch(() => setItems([]));
  }, []);

  return (
    <div className="min-w-0 rounded-clay border border-white/80 bg-clay-surface shadow-clay-sm">
      <div className="border-b border-zinc-100 px-4 py-2.5">
        <h2 className="text-xs font-semibold text-zinc-900">Recent activity</h2>
        <p className="mt-0.5 text-[11px] text-zinc-400">Live across the platform</p>
      </div>

      {items === null ? (
        <p className="px-4 py-6 text-sm text-zinc-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-zinc-400">No recent activity yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {items.map((item) => {
            const Icon = TYPE_ICONS[item.type];
            return (
              <li key={item.key} className="flex items-center gap-2.5 px-4 py-2">
                <Icon className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
                <Link
                  href={item.href as Route}
                  className="min-w-0 flex-1 truncate text-xs text-zinc-700 hover:text-zinc-900 hover:underline"
                >
                  {item.label}
                </Link>
                <span className="shrink-0 text-[11px] tabular-nums text-zinc-400">
                  {timeAgo(item.createdAt)}
                </span>
                {item.type === "review" && (
                  <Link
                    href="/admin/reviews"
                    className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 transition hover:bg-zinc-200"
                  >
                    Review
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
