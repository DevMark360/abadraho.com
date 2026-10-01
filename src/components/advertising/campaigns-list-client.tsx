"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Plus, Megaphone, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";
import type { AdCampaignRow } from "@/server/services/advertising-campaign.service";

export const STATUS_BADGE: Record<string, string> = {
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

function placementLabel(placementType: string) {
  return PLACEMENT_LABELS[placementType] ?? placementType;
}

function CampaignsListContent() {
  const [items, setItems] = useState<AdCampaignRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/v1/advertising/campaigns", { credentials: "same-origin" });
      const j = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (j.success) {
        setItems(j.items);
      } else {
        setError(j.message ?? "Could not load campaigns");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        {error}
      </div>
    );
  }
  if (!items) {
    return <LoadingState size="sm" label="Loading campaigns…" />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/advertising"
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to advertising
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Campaigns</h1>
        <Button asChild className={designTw.btnPrimary}>
          <Link href="/advertising/campaigns/new">
            <Plus className="mr-2 h-4 w-4" />
            New campaign
          </Link>
        </Button>
      </div>

      <section className={cn(designTw.publicCard, "overflow-hidden")}>
        {items.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <Megaphone className="h-10 w-10 text-zinc-300" />
            <p className="mt-4 text-sm text-zinc-500">No campaigns yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {items.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-zinc-50/80"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900">{c.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {placementLabel(c.placementType)} · Rs. {c.maxBidCpm.toLocaleString()}/1000
                    impressions · budget Rs. {c.budgetCap.toLocaleString()}
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
    </div>
  );
}

export function CampaignsListClient() {
  return <CampaignsListContent />;
}
