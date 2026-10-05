"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

type CatalogEntry = { cards: number; price: number };
type PackageRow = {
  id: number;
  projectId: number;
  projectName: string;
  totalCards: number;
  usedCards: number;
  pricePaid: number;
  status: string;
  createdAt: string;
};
type CardRow = { id: number; fileUrl: string; createdAt: string };

function WhatsappPackagesContent() {
  const [projects, setProjects] = useState<Array<{ id: number; name: string }> | null>(null);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [packages, setPackages] = useState<PackageRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [projectId, setProjectId] = useState<number | "">("");
  const [cards, setCards] = useState<number | "">("");
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [cardsByPackage, setCardsByPackage] = useState<Record<number, CardRow[]>>({});
  const [lastShareUrl, setLastShareUrl] = useState<string | null>(null);

  async function load() {
    const [optionsRes, packagesRes] = await Promise.all([
      fetch("/api/v1/advertising/options", { credentials: "same-origin" }),
      fetch("/api/v1/advertising/whatsapp-packages", { credentials: "same-origin" }),
    ]);
    const options = await optionsRes.json().catch(() => ({}));
    const pkgs = await packagesRes.json().catch(() => ({}));
    if (options.success) {
      setProjects(options.projects);
      if (options.projects?.[0]) setProjectId(options.projects[0].id);
    }
    if (pkgs.success) {
      setCatalog(pkgs.catalog);
      setPackages(pkgs.packages);
      if (pkgs.catalog?.[0]) setCards(pkgs.catalog[0].cards);
    } else {
      setError(pkgs.message ?? "Could not load WhatsApp packages");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handlePurchase(e: React.FormEvent) {
    e.preventDefault();
    setPurchaseError(null);
    if (!projectId || !cards) {
      setPurchaseError("Select a project and package size");
      return;
    }
    setPurchasing(true);
    try {
      const res = await fetch("/api/v1/advertising/whatsapp-packages", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, cards }),
      });
      const j = await res.json().catch(() => ({}));
      if (!j.success) {
        setPurchaseError(j.message ?? "Could not purchase package");
        return;
      }
      await load();
    } finally {
      setPurchasing(false);
    }
  }

  async function handleGenerate(packageId: number) {
    setGeneratingId(packageId);
    setGenerateError(null);
    setLastShareUrl(null);
    try {
      const res = await fetch(`/api/v1/advertising/whatsapp-packages/${packageId}/cards`, {
        method: "POST",
        credentials: "same-origin",
      });
      const j = await res.json().catch(() => ({}));
      if (!j.success) {
        setGenerateError(j.message ?? "Could not generate card");
        return;
      }
      setLastShareUrl(j.shareUrl);
      await load();
      if (expandedId === packageId) await loadCards(packageId);
    } finally {
      setGeneratingId(null);
    }
  }

  async function loadCards(packageId: number) {
    const res = await fetch(`/api/v1/advertising/whatsapp-packages/${packageId}/cards`, {
      credentials: "same-origin",
    });
    const j = await res.json().catch(() => ({}));
    if (j.success) {
      setCardsByPackage((prev) => ({ ...prev, [packageId]: j.cards }));
    }
  }

  async function toggleExpand(packageId: number) {
    if (expandedId === packageId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(packageId);
    if (!cardsByPackage[packageId]) await loadCards(packageId);
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        {error}
      </div>
    );
  }
  if (!projects || !packages) {
    return <LoadingState size="sm" label="Loading WhatsApp packages…" />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Link
        href="/advertising"
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to advertising
      </Link>
      <h1 className="text-xl font-semibold text-zinc-900">WhatsApp ad card packages</h1>
      <p className="text-sm text-zinc-500">
        Buy a flat-fee package of shareable WhatsApp cards for a project. Each generated card
        draws down your package&apos;s remaining credit. This is a pre-paid package, not an
        auction campaign.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          <section className={cn(designTw.publicCard, "space-y-4 p-6")}>
            <h2 className="text-sm font-semibold text-zinc-900">Buy a package</h2>
            <form onSubmit={handlePurchase} className="space-y-4">
              {purchaseError ? <p className="text-sm text-red-700">{purchaseError}</p> : null}
              <div>
                <label className="block text-sm font-medium text-zinc-700">Project</label>
                <Select
                  layout="field"
                  value={projectId}
                  onChange={(e) => setProjectId(Number(e.target.value))}
                >
                  {projects.length === 0 ? (
                    <option value="">No owned projects found</option>
                  ) : (
                    projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))
                  )}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Package size</label>
                <Select layout="field" value={cards} onChange={(e) => setCards(Number(e.target.value))}>
                  {catalog.map((c) => (
                    <option key={c.cards} value={c.cards}>
                      {c.cards} cards for Rs. {c.price.toLocaleString()}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" className={designTw.btnPrimary} disabled={purchasing}>
                {purchasing ? "Purchasing…" : "Purchase package"}
              </Button>
            </form>
          </section>

          {lastShareUrl ? (
            <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Card generated:{" "}
              <a href={lastShareUrl} target="_blank" rel="noopener noreferrer" className="underline">
                share on WhatsApp
              </a>
            </div>
          ) : null}
        </div>
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-4">
          <section className={cn(designTw.publicCard, "overflow-hidden")}>
            <div className="border-b border-zinc-100 px-5 py-4">
              <h2 className="font-semibold text-zinc-900">Your packages</h2>
            </div>
            {generateError ? (
              <p className="border-b border-zinc-100 px-5 py-3 text-sm text-red-700">
                {generateError}
              </p>
            ) : null}
            {packages.length === 0 ? (
              <p className="px-5 py-8 text-sm text-zinc-500">No packages purchased yet.</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {packages.map((pkg) => (
                  <li key={pkg.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900">{pkg.projectName}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {pkg.usedCards}/{pkg.totalCards} cards used · Rs.{" "}
                          {pkg.pricePaid.toLocaleString()} paid
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                            pkg.status === "active"
                              ? "bg-emerald-50 text-emerald-800 ring-emerald-600/20"
                              : "bg-zinc-100 text-zinc-600 ring-zinc-500/20"
                          )}
                        >
                          {pkg.status}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={pkg.status !== "active" || generatingId === pkg.id}
                          onClick={() => handleGenerate(pkg.id)}
                        >
                          {generatingId === pkg.id ? "Generating…" : "Generate card"}
                        </Button>
                        <button
                          type="button"
                          className="text-xs font-medium text-zinc-500 underline"
                          onClick={() => toggleExpand(pkg.id)}
                        >
                          {expandedId === pkg.id ? "Hide cards" : "View cards"}
                        </button>
                      </div>
                    </div>
                    {expandedId === pkg.id ? (
                      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {(cardsByPackage[pkg.id] ?? []).length === 0 ? (
                          <p className="col-span-full text-xs text-zinc-500">No cards generated yet.</p>
                        ) : (
                          (cardsByPackage[pkg.id] ?? []).map((c) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={c.id}
                              src={c.fileUrl}
                              alt="WhatsApp ad card"
                              className="aspect-square w-full rounded-lg object-cover"
                            />
                          ))
                        )}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

export function WhatsappPackagesClient() {
  return <WhatsappPackagesContent />;
}
