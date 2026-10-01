"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  BadgeCheck,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Star,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

type AttentionItem = {
  key: string;
  label: string;
  count: number;
  href: string;
  actionLabel: string;
};

const ITEM_ICONS: Record<string, LucideIcon> = {
  campaigns: BadgeCheck,
  wallet: Wallet,
  brokerRequests: UsersRound,
  reviews: Star,
  events: Calendar,
};

export function AdminAttentionPanel() {
  const [items, setItems] = useState<AttentionItem[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/needs-attention")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setItems(json.items);
      })
      .catch(() => setItems([]));
  }, []);

  if (items === null) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-400">Checking pending items…</p>
      </div>
    );
  }

  const total = items.reduce((s, i) => s + i.count, 0);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-2.5">
        <div>
          <h2 className="text-xs font-semibold text-zinc-900">Needs your attention</h2>
          <p className="mt-0.5 text-[11px] text-zinc-400">Pending decisions across the platform</p>
        </div>
        {total > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-800">
            {total}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 px-4 py-6">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <p className="text-sm text-zinc-500">All caught up — nothing pending right now.</p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {items.map((item) => {
            const Icon = ITEM_ICONS[item.key] ?? BadgeCheck;
            return (
              <li key={item.key} className="flex items-center gap-2.5 px-4 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-500">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 text-xs text-zinc-700">{item.label}</span>
                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-amber-700">
                  {item.count}
                </span>
                <Link
                  href={item.href as Route}
                  className="shrink-0 rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white transition hover:bg-zinc-700"
                >
                  {item.actionLabel}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {items.length > 0 && (
        <Link
          href={items[0].href as Route}
          className="flex items-center justify-between border-t border-zinc-100 px-4 py-2 text-xs font-medium text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800"
        >
          <span className="flex items-center gap-1.5">
            <BadgeCheck className="h-3.5 w-3.5" />
            Quick resolve — start with {items[0].label.toLowerCase()}
          </span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
