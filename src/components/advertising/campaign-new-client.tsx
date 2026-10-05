"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/ui/loading-state";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

type FormOptions = {
  projects: Array<{ id: number; name: string }>;
  areas: Array<{ id: number; name: string }>;
  projectTypes: Array<{ id: number; title: string }>;
  tiers: string[];
  placementTypes: string[];
};

const PLACEMENT_LABELS: Record<string, string> = {
  featured_listing: "Featured listing",
  banner: "Banner",
  sponsored_content: "Sponsored content",
};

function placementLabel(placementType: string) {
  return PLACEMENT_LABELS[placementType] ?? placementType;
}

const TIER_LABELS: Record<string, string> = {
  luxury: "Luxury",
  premium: "Premium",
  mid_range: "Mid-range",
  affordable: "Affordable",
};

function tierLabel(tier: string) {
  return TIER_LABELS[tier] ?? tier;
}

function todayPlusDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function CampaignNewContent() {
  const router = useRouter();
  const [options, setOptions] = useState<FormOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [projectId, setProjectId] = useState<number | "">("");
  const [placementType, setPlacementType] = useState<string>("");
  const [title, setTitle] = useState("");
  const [maxBidCpm, setMaxBidCpm] = useState("");
  const [budgetCap, setBudgetCap] = useState("");
  const [dailyBudget, setDailyBudget] = useState("");
  const [impressionCap, setImpressionCap] = useState("");
  const [startDate, setStartDate] = useState(todayPlusDays(1));
  const [endDate, setEndDate] = useState(todayPlusDays(15));
  const [areaIds, setAreaIds] = useState<number[]>([]);
  const [projectTypeIds, setProjectTypeIds] = useState<number[]>([]);
  const [tiers, setTiers] = useState<string[]>([]);
  const [showOnHomepage, setShowOnHomepage] = useState(false);

  function handleShowOnHomepageChange(checked: boolean) {
    setShowOnHomepage(checked);
    if (checked) {
      // Leaving targeting empty is what makes a campaign eligible for the homepage's
      // untargeted placements — clear any prior selections so they don't linger hidden.
      setAreaIds([]);
      setProjectTypeIds([]);
      setTiers([]);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/v1/advertising/options", { credentials: "same-origin" });
      const j = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (j.success) {
        setOptions(j);
        setPlacementType(j.placementTypes?.[0] ?? "");
        if (j.projects?.[0]) setProjectId(j.projects[0].id);
      } else {
        setLoadError(j.message ?? "Could not load form options");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleId(list: number[], id: number, setList: (v: number[]) => void) {
    setList(list.includes(id) ? list.filter((v) => v !== id) : [...list, id]);
  }

  function toggleValue(list: string[], value: string, setList: (v: string[]) => void) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!projectId) {
      setFormError("Select a project");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/advertising/campaigns", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          placementType,
          title,
          maxBidCpm: Number(maxBidCpm),
          budgetCap: Number(budgetCap),
          dailyBudget: dailyBudget ? Number(dailyBudget) : null,
          impressionCap: impressionCap ? Number(impressionCap) : null,
          startDate,
          endDate,
          areaIds: showOnHomepage ? [] : areaIds,
          projectTypeIds: showOnHomepage ? [] : projectTypeIds,
          tiers: showOnHomepage ? [] : tiers,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!j.success) {
        setFormError(j.message ?? "Could not create campaign");
        return;
      }
      router.push(`/advertising/campaigns/${j.campaign.id}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        {loadError}
      </div>
    );
  }
  if (!options) {
    return <LoadingState size="sm" label="Loading form…" />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Link
        href="/advertising/campaigns"
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to campaigns
      </Link>
      <h1 className="text-xl font-semibold text-zinc-900">New campaign</h1>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="min-w-0">
          <form onSubmit={handleSubmit} className={cn(designTw.publicCard, "space-y-5 p-6")}>
            {formError ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>
            ) : null}

            <div>
              <label className="block text-sm font-medium text-zinc-700">Project</label>
              <Select
                layout="field"
                value={projectId}
                onChange={(e) => setProjectId(Number(e.target.value))}
              >
                {options.projects.length === 0 ? (
                  <option value="">No owned projects found</option>
                ) : (
                  options.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))
                )}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Placement</label>
              <Select
                layout="field"
                value={placementType}
                onChange={(e) => setPlacementType(e.target.value)}
              >
                {options.placementTypes.map((p) => (
                  <option key={p} value={p}>
                    {placementLabel(p)}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Title</label>
              <Input
                layout="field"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Summer launch: Featured listing"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Max bid (Rs. / 1000 impressions)</label>
                <Input
                  layout="field"
                  type="number"
                  min={1}
                  value={maxBidCpm}
                  onChange={(e) => setMaxBidCpm(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">Budget cap (Rs.)</label>
                <Input
                  layout="field"
                  type="number"
                  min={1}
                  value={budgetCap}
                  onChange={(e) => setBudgetCap(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Daily budget (Rs., optional)
              </label>
              <Input
                layout="field"
                type="number"
                min={1}
                value={dailyBudget}
                onChange={(e) => setDailyBudget(e.target.value)}
                placeholder="Leave blank to spread the budget cap evenly over the campaign"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Caps how much this campaign spends per day and sets its weight in the ad rotation
                alongside your max bid. Leave blank to derive it automatically from the budget cap
                divided across the campaign&apos;s days.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Impression cap (optional)
              </label>
              <Input
                layout="field"
                type="number"
                min={1}
                value={impressionCap}
                onChange={(e) => setImpressionCap(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700">Start date</label>
                <Input
                  layout="field"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">End date</label>
                <Input
                  layout="field"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={showOnHomepage}
                onChange={(e) => handleShowOnHomepageChange(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium text-zinc-800">Show on home page</span>
                <span className="block text-xs text-zinc-500">
                  Skip targeting below. An untargeted campaign is eligible for the homepage&apos;s
                  broad placements. Target specific areas, property types, or tiers instead if you
                  want this campaign focused on matching listing pages only.
                </span>
              </span>
            </label>

            {!showOnHomepage && (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-700">Target areas</label>
                  <div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-lg border border-zinc-200 p-3">
                    {options.areas.map((a) => (
                      <label
                        key={a.id}
                        className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-2.5 py-1 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={areaIds.includes(a.id)}
                          onChange={() => toggleId(areaIds, a.id, setAreaIds)}
                        />
                        {a.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700">Target property types</label>
                  <div className="mt-2 flex flex-wrap gap-2 rounded-lg border border-zinc-200 p-3">
                    {options.projectTypes.map((t) => (
                      <label
                        key={t.id}
                        className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-2.5 py-1 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={projectTypeIds.includes(t.id)}
                          onChange={() => toggleId(projectTypeIds, t.id, setProjectTypeIds)}
                        />
                        {t.title}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700">
                    Target project tiers (optional)
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2 rounded-lg border border-zinc-200 p-3">
                    {options.tiers.map((tier) => (
                      <label
                        key={tier}
                        className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-2.5 py-1 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={tiers.includes(tier)}
                          onChange={() => toggleValue(tiers, tier, setTiers)}
                        />
                        {tierLabel(tier)}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Button type="submit" className={designTw.btnPrimary} disabled={submitting}>
              {submitting ? "Creating…" : "Create draft"}
            </Button>
          </form>
        </div>
        <aside className="lg:sticky lg:top-4">
          <div className={cn(designTw.publicCard, "space-y-4 p-6")}>
            <h2 className="text-sm font-semibold text-zinc-900">How campaigns work</h2>
            <ul className="space-y-3 text-sm leading-relaxed text-zinc-600">
              <li>
                <span className="font-medium text-zinc-900">Max bid:</span> the most you pay each
                time your ad is shown 1,000 times.
              </li>
              <li>
                <span className="font-medium text-zinc-900">Budget cap:</span> your total spend
                limit. A daily budget spreads it across the campaign&apos;s days.
              </li>
              <li>
                <span className="font-medium text-zinc-900">Wallet:</span> spend is deducted from
                your ad wallet, so{" "}
                <Link href="/advertising/wallet" className="font-medium text-brand-accent hover:underline">
                  top up first
                </Link>
                .
              </li>
              <li>
                <span className="font-medium text-zinc-900">Review:</span> our team checks new
                campaigns before they go live.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function CampaignNewClient() {
  return <CampaignNewContent />;
}
