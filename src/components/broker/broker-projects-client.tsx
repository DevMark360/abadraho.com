"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Building2, Search } from "lucide-react";
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
import { clientAbsoluteUrl } from "@/lib/client/absolute-url";
import { cn } from "@/lib/utils";

type ProjectRow = {
  id: number;
  name: string;
  slug: string;
  areaName: string | null;
  minPrice: number | null;
  projectUrl: string;
  pitchDeck: { id: number; fileUrl: string | null } | null;
  whatsappCard: { id: number; fileUrl: string | null } | null;
  shortLink: { id: number; shortCode: string; shortPath: string; shortUrl: string; clicks: number } | null;
};

type ActionKey = "deck-generate" | "card-generate" | "short-link";

export function BrokerProjectsClient() {
  const [items, setItems] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize] = useState(30);
  const [q, setQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [brokerToolsReady, setBrokerToolsReady] = useState(true);
  const [busy, setBusy] = useState<{ projectId: number; action: ActionKey } | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (q.trim()) params.set("q", q.trim());

    try {
      const res = await fetch(`/api/v1/broker/projects?${params}`, { credentials: "same-origin" });
      const j = await res.json();
      if (j.success) {
        setItems(Array.isArray(j.items) ? j.items : []);
        setTotal(Number(j.total) || 0);
        setBrokerToolsReady(j.brokerToolsReady !== false);
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function runAction(projectId: number, action: ActionKey) {
    setBusy({ projectId, action });
    setMessage(null);

    try {
      if (action === "deck-generate") {
        const res = await fetch("/api/v1/broker/pitch-decks", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        const j = await res.json();
        if (!j.success) {
          setMessage({ type: "err", text: j.message ?? "Could not generate pitch deck" });
          return;
        }
        setMessage({ type: "ok", text: "Pitch deck ready" });
      } else if (action === "card-generate") {
        const res = await fetch("/api/v1/broker/whatsapp-cards", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        const j = await res.json();
        if (!j.success) {
          setMessage({ type: "err", text: j.message ?? "Could not generate WhatsApp card" });
          return;
        }
        setMessage({ type: "ok", text: "WhatsApp card ready" });
      } else if (action === "short-link") {
        const res = await fetch("/api/v1/broker/short-links", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        const j = await res.json();
        if (!j.success) {
          setMessage({ type: "err", text: j.message ?? "Could not create short link" });
          return;
        }
        if (j.shortPath) {
          await navigator.clipboard
            .writeText(clientAbsoluteUrl(j.shortPath))
            .catch(() => undefined);
        } else if (j.shortUrl) {
          await navigator.clipboard
            .writeText(clientAbsoluteUrl(j.shortUrl))
            .catch(() => undefined);
        }
        setMessage({ type: "ok", text: "Short link copied to clipboard" });
      }

      await loadProjects();
    } catch {
      setMessage({ type: "err", text: "Request failed. Try again." });
    } finally {
      setBusy(null);
    }
  }

  async function shareWhatsappCard(cardId: number) {
    try {
      const res = await fetch(`/api/v1/broker/whatsapp-cards/${cardId}/share`, {
        method: "POST",
        credentials: "same-origin",
      });
      const j = await res.json();
      if (j.success && j.shareUrl) {
        window.open(j.shareUrl, "_blank", "noopener,noreferrer");
      } else {
        setMessage({ type: "err", text: j.message ?? "Could not open WhatsApp share" });
      }
    } catch {
      setMessage({ type: "err", text: "Share failed" });
    }
  }

  function isBusy(projectId: number, action?: ActionKey) {
    if (!busy || busy.projectId !== projectId) return false;
    return action ? busy.action === action : true;
  }

  return (
    <BrokerGate>
      <BrokerSubpageShell
        title="All listings"
        description="Active platform listings. Generate pitch decks, WhatsApp cards, and trackable short links."
        icon={brokerPageIcon(Building2)}
        iconBgClassName="bg-zinc-100"
      >
        {!brokerToolsReady && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
            Marketing tool tables are missing in the database. Contact admin to run broker table
            migration.
          </div>
        )}

        {message && (
          <div
            className={cn(
              "rounded-2xl px-5 py-4 text-sm",
              message.type === "ok"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border border-red-200 bg-red-50 text-red-800"
            )}
          >
            {message.text}
          </div>
        )}

        <section className={cn(designTw.publicCard, "p-5")}>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setQ(searchInput);
            }}
          >
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search listings by name…"
                className="w-full rounded-lg border border-zinc-200 py-2.5 pl-9 pr-3 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>
          {!loading && total > 0 ? (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <BrokerCountBadge count={total} label="listings" />
              {q ? <span>matching “{q}”</span> : null}
            </p>
          ) : null}
        </section>

        {loading ? (
          <LoadingState size="sm" label="Loading listings…" />
        ) : items.length === 0 ? (
          <BrokerEmptyState
            icon={Building2}
            title="No listings found"
            description={
              q
                ? "Try a different search term or clear the filter to browse all active listings."
                : "There are no active listings in the database right now."
            }
          />
        ) : (
          <ul className="space-y-4">
            {items.map((p) => (
              <li key={p.id} className={cn(designTw.publicCard, "overflow-hidden")}>
                <div className="border-b border-zinc-100 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/project/${p.slug}`}
                        className="text-base font-semibold text-zinc-900 hover:underline"
                      >
                        {p.name}
                      </Link>
                      {p.areaName && (
                        <p className="mt-0.5 text-xs text-zinc-500">{p.areaName}</p>
                      )}
                    </div>
                    {p.minPrice != null && (
                      <p className="text-sm font-medium text-zinc-700">
                        From {p.minPrice.toLocaleString()} PKR
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.pitchDeck?.fileUrl ? (
                      <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-800 ring-1 ring-inset ring-violet-600/20">
                        Pitch deck ready
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-500">
                        No deck
                      </span>
                    )}
                    {p.whatsappCard?.fileUrl ? (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
                        WhatsApp card ready
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-500">
                        No card
                      </span>
                    )}
                    {p.shortLink ? (
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800 ring-1 ring-inset ring-blue-600/20">
                        {p.shortLink.clicks} clicks
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-500">
                        No short link
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 px-5 py-4">
                  {p.pitchDeck?.fileUrl ? (
                    <a
                      href={p.pitchDeck.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
                    >
                      Open deck
                    </a>
                  ) : null}
                  {p.whatsappCard?.fileUrl ? (
                    <>
                      <a
                        href={p.whatsappCard.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-50"
                      >
                        Open card
                      </a>
                      <button
                        type="button"
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                        onClick={() => void shareWhatsappCard(p.whatsappCard!.id)}
                      >
                        Share on WhatsApp
                      </button>
                    </>
                  ) : null}
                  {p.shortLink ? (
                    <a
                      href={clientAbsoluteUrl(p.shortLink.shortPath)}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-800 ring-1 ring-blue-200 hover:bg-blue-50"
                    >
                      Open short link
                    </a>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 border-t border-zinc-100 bg-zinc-50/50 px-5 py-4">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!brokerToolsReady || isBusy(p.id)}
                    onClick={() => void runAction(p.id, "deck-generate")}
                  >
                    {isBusy(p.id, "deck-generate") ? "Generating…" : p.pitchDeck ? "Regenerate deck" : "Generate deck"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!brokerToolsReady || isBusy(p.id)}
                    onClick={() => void runAction(p.id, "card-generate")}
                  >
                    {isBusy(p.id, "card-generate")
                      ? "Generating…"
                      : p.whatsappCard
                        ? "Regenerate card"
                        : "Generate card"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!brokerToolsReady || isBusy(p.id)}
                    onClick={() => void runAction(p.id, "short-link")}
                  >
                    {isBusy(p.id, "short-link")
                      ? "Creating…"
                      : p.shortLink
                        ? "Copy short link"
                        : "Create short link"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {total > pageSize && (
          <div
            className={cn(
              designTw.publicCard,
              "flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm"
            )}
          >
            <p className="text-zinc-600">
              Page {page} of {totalPages} · {total.toLocaleString()} listings
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </BrokerSubpageShell>
    </BrokerGate>
  );
}
