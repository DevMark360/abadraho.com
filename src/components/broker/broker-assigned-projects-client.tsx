"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Building2, ExternalLink } from "lucide-react";
import { BrokerGate } from "@/components/broker/broker-gate";
import { BrokerSubpageShell, brokerPageIcon } from "@/components/broker/broker-subpage-shell";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";
import { formatCommissionRate } from "@/config/broker-agent";
import { clientAbsoluteUrl } from "@/lib/client/absolute-url";
import { VerifiedListingBadge } from "@/components/marketing/trust-signals";

type MarketingAssets = {
  pitchDeck: { id: number; fileUrl: string | null } | null;
  whatsappCard: { id: number; fileUrl: string | null } | null;
  shortLink: {
    id: number;
    shortCode: string;
    shortPath: string;
    shortUrl: string;
    clicks: number;
  } | null;
};

type Row = {
  id: number;
  projectId: number;
  projectName: string;
  projectSlug: string;
  areaName: string | null;
  builderName: string | null;
  commissionType: "percentage" | "fixed";
  commissionValue: number;
  imageUrl: string | null;
  minPrice: number | null;
  unitsCount: number;
} & MarketingAssets;

type ActionKey = "deck-generate" | "card-generate" | "short-link";

export function BrokerAssignedProjectsClient() {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [brokerToolsReady, setBrokerToolsReady] = useState(true);
  const [q, setQ] = useState("");
  const [commissionType, setCommissionType] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [busy, setBusy] = useState<{ projectId: number; action: ActionKey } | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ resource: "assigned-projects" });
    if (q.trim()) params.set("q", q.trim());
    if (commissionType) params.set("commissionType", commissionType);
    const res = await fetch(`/api/v1/broker/ops?${params}`, { credentials: "same-origin" });
    const j = await res.json();
    setItems(j.success && Array.isArray(j.items) ? j.items : []);
    setBrokerToolsReady(j.brokerToolsReady !== false);
    setLoading(false);
  }, [q, commissionType]);

  useEffect(() => {
    load();
  }, [load]);

  const areas = [...new Set(items.map((i) => i.areaName).filter(Boolean))] as string[];
  const shown = areaFilter ? items.filter((i) => i.areaName === areaFilter) : items;

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

      await load();
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
        title="My projects"
        description="Assigned listings — generate pitch decks, WhatsApp cards, and trackable short links."
        icon={brokerPageIcon(Building2)}
      >
        {!brokerToolsReady && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Marketing tool tables are missing in the database. Contact admin to run broker table migration.
          </div>
        )}

        {message ? (
          <div
            className={cn(
              "mb-4 rounded-xl px-4 py-3 text-sm",
              message.type === "ok"
                ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border border-red-200 bg-red-50 text-red-800"
            )}
          >
            {message.text}
          </div>
        ) : null}

        <div className="mb-6 flex flex-wrap gap-3">
          <input
            className="min-w-[200px] flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="Search project name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
          >
            <option value="">All areas</option>
            {areas.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            value={commissionType}
            onChange={(e) => setCommissionType(e.target.value)}
          >
            <option value="">All commission types</option>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed</option>
          </select>
        </div>

        {loading ? (
          <LoadingState size="sm" />
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-10 text-center">
            <Building2 className="mx-auto h-10 w-10 text-zinc-300" />
            <p className="mt-4 font-medium text-zinc-900">Abhi koi project assign nahi hua</p>
            <p className="mt-2 text-sm text-zinc-500">Admin se rabta karein ya browse se request bhejein.</p>
            <Button asChild className="mt-4">
              <Link href="/broker/browse">Browse projects</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {shown.map((p) => (
              <article key={p.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className="relative h-40 bg-zinc-100">
                  {p.imageUrl ? (
                    <Image src={p.imageUrl} alt="" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Building2 className="h-10 w-10 text-zinc-300" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-zinc-900">{p.projectName}</h3>
                    <VerifiedListingBadge />
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {[p.areaName, p.builderName].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-2 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                    {formatCommissionRate(p.commissionType, p.commissionValue)}
                  </p>
                  <p className="mt-2 text-sm text-zinc-600">
                    {p.unitsCount} units · {p.minPrice ? formatPrice(p.minPrice, "PKR") : "Price on request"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.pitchDeck?.fileUrl ? (
                      <span className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-800">
                        Deck ready
                      </span>
                    ) : null}
                    {p.whatsappCard?.fileUrl ? (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                        Card ready
                      </span>
                    ) : null}
                    {p.shortLink ? (
                      <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-800">
                        {p.shortLink.clicks} clicks
                      </span>
                    ) : null}
                  </div>

                  {(p.pitchDeck?.fileUrl || p.whatsappCard?.fileUrl || p.shortLink) && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.pitchDeck?.fileUrl ? (
                        <a
                          href={p.pitchDeck.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg px-2.5 py-1 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
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
                            className="rounded-lg px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-50"
                          >
                            Open card
                          </a>
                          <button
                            type="button"
                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
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
                          className="rounded-lg px-2.5 py-1 text-xs font-medium text-blue-800 ring-1 ring-blue-200 hover:bg-blue-50"
                        >
                          Open link
                        </a>
                      ) : null}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!brokerToolsReady || isBusy(p.projectId)}
                      onClick={() => void runAction(p.projectId, "deck-generate")}
                    >
                      {isBusy(p.projectId, "deck-generate")
                        ? "Generating…"
                        : p.pitchDeck
                          ? "Regenerate deck"
                          : "Generate deck"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!brokerToolsReady || isBusy(p.projectId)}
                      onClick={() => void runAction(p.projectId, "card-generate")}
                    >
                      {isBusy(p.projectId, "card-generate")
                        ? "Generating…"
                        : p.whatsappCard
                          ? "Regenerate card"
                          : "Generate card"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!brokerToolsReady || isBusy(p.projectId)}
                      onClick={() => void runAction(p.projectId, "short-link")}
                    >
                      {isBusy(p.projectId, "short-link")
                        ? "Creating…"
                        : p.shortLink
                          ? "Copy short link"
                          : "Create short link"}
                    </Button>
                    <Button asChild size="sm" variant="accent">
                      <Link href={`/project/${p.projectSlug}`}>
                        View listing <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </BrokerSubpageShell>
    </BrokerGate>
  );
}
