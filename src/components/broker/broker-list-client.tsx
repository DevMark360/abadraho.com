"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Route } from "next";
import {
  Building2,
  ExternalLink,
  FileText,
  MessageCircle,
} from "lucide-react";
import { BrokerGate } from "@/components/broker/broker-gate";
import {
  BrokerCountBadge,
  BrokerEmptyState,
  BrokerSubpageShell,
  brokerPageIcon,
} from "@/components/broker/broker-subpage-shell";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

type Row = {
  id: number;
  projectName: string;
  projectSlug: string;
  fileUrl: string | null;
  createdAt: string;
};

type ListConfig = {
  title: string;
  description: string;
  apiPath: string;
  emptyTitle: string;
  emptyDescription: string;
  icon: typeof FileText;
  iconClassName: string;
  iconBgClassName: string;
  accentRing: string;
  openLabel: string;
};

const PITCH_DECK_CONFIG: ListConfig = {
  title: "Pitch decks",
  description: "PDF brochures linked to your listings — open, share, or regenerate from All listings.",
  apiPath: "/api/v1/broker/pitch-decks",
  emptyTitle: "No pitch decks yet",
  emptyDescription: "Generate a deck from a listing on All listings.",
  icon: FileText,
  iconClassName: "text-violet-700",
  iconBgClassName: "bg-violet-50",
  accentRing: "ring-violet-600/10",
  openLabel: "Open PDF",
};

const WHATSAPP_CONFIG: ListConfig = {
  title: "WhatsApp cards",
  description: "Shareable images for WhatsApp — generated from listing covers.",
  apiPath: "/api/v1/broker/whatsapp-cards",
  emptyTitle: "No WhatsApp cards yet",
  emptyDescription: "Generate a card from a project cover on All listings.",
  icon: MessageCircle,
  iconClassName: "text-emerald-700",
  iconBgClassName: "bg-emerald-50",
  accentRing: "ring-emerald-600/10",
  openLabel: "Open image",
};

export function BrokerPitchDecksClient() {
  return <BrokerAssetListClient config={PITCH_DECK_CONFIG} />;
}

export function BrokerWhatsappCardsClient() {
  return <BrokerAssetListClient config={WHATSAPP_CONFIG} />;
}

function BrokerAssetListClient({ config }: { config: ListConfig }) {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const Icon = config.icon;

  useEffect(() => {
    fetch(config.apiPath, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.items)) setItems(j.items);
      })
      .finally(() => setLoading(false));
  }, [config.apiPath]);

  return (
    <BrokerGate>
      <BrokerSubpageShell
        title={config.title}
        description={config.description}
        icon={brokerPageIcon(Icon, config.iconClassName)}
        iconBgClassName={config.iconBgClassName}
        action={
          <Button asChild size="sm">
            <Link href="/broker/projects">
              <Building2 className="mr-2 h-4 w-4" />
              All listings
            </Link>
          </Button>
        }
      >
        {loading ? (
          <LoadingState size="sm" label={`Loading ${config.title.toLowerCase()}…`} />
        ) : items.length === 0 ? (
          <BrokerEmptyState
            icon={Icon}
            title={config.emptyTitle}
            description={config.emptyDescription}
            actionHref="/broker/projects"
            actionLabel="Go to All listings"
          />
        ) : (
          <section className={cn(designTw.publicCard, "overflow-hidden")}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
              <p className="text-sm font-medium text-zinc-900">Your {config.title.toLowerCase()}</p>
              <BrokerCountBadge count={items.length} label="total" />
            </div>
            <ul className="divide-y divide-zinc-100">
              {items.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition hover:bg-zinc-50/80"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                        config.iconBgClassName,
                        config.accentRing
                      )}
                    >
                      <Icon className={cn("h-5 w-5", config.iconClassName)} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-900">{row.projectName}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        Created{" "}
                        {new Date(row.createdAt).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {row.projectSlug ? (
                      <Link
                        href={`/project/${row.projectSlug}` as Route}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200 transition hover:bg-white hover:ring-zinc-300"
                      >
                        View listing
                      </Link>
                    ) : null}
                    {row.fileUrl ? (
                      <a
                        href={row.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-800"
                      >
                        {config.openLabel}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-zinc-400">No file attached</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </BrokerSubpageShell>
    </BrokerGate>
  );
}
