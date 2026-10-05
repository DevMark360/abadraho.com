"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { STATUS_BADGE } from "@/components/advertising/campaigns-list-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

type CampaignDetail = {
  id: number;
  projectId: number;
  placementType: string;
  title: string;
  status: string;
  rejectionReason: string | null;
  maxBidCpm: number;
  budgetCap: number;
  dailyBudget: number | null;
  impressionCap: number | null;
  startDate: string;
  endDate: string;
  areaIds: number[];
  projectTypeIds: number[];
  tiers: string[];
  refundedAt: string | null;
  refundAmount: number | null;
  isArchive: boolean;
};

type CampaignStats = { impressions: number; clicks: number; spend: number; ctr: number };
type CampaignPacing = {
  daysElapsed: number;
  totalDays: number;
  impressions: number;
  spend: number;
  impressionCap: number | null;
  budgetCap: number;
  currentEffectiveCpm: number | null;
  pacingBasis: "impressions" | "budget";
  actualPace: number;
  targetPace: number;
  status: "not_started" | "on_track" | "under_delivering" | "completed";
};
type CampaignSlotCompetition = {
  slotsContesting: number;
  avgSharePercent: number;
  slotsAtFloorShare: number;
  strongestCompetitorWeight: number | null;
};

const PACING_LABELS: Record<CampaignPacing["status"], string> = {
  not_started: "Not started yet",
  on_track: "On track to deliver by end date",
  under_delivering: "Under-delivering: may not fully spend by end date",
  completed: "Schedule complete",
};

const PACING_BADGE: Record<CampaignPacing["status"], string> = {
  not_started: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
  on_track: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  under_delivering: "bg-amber-50 text-amber-800 ring-amber-600/20",
  completed: "bg-zinc-100 text-zinc-600 ring-zinc-500/20",
};

const PLACEMENT_LABELS: Record<string, string> = {
  featured_listing: "Featured listing",
  banner: "Banner",
  sponsored_content: "Sponsored content",
};

function placementLabel(placementType: string) {
  return PLACEMENT_LABELS[placementType] ?? placementType;
}

function CampaignDetailContent({ campaignId }: { campaignId: number }) {
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [pacing, setPacing] = useState<CampaignPacing | null>(null);
  const [slotCompetition, setSlotCompetition] = useState<CampaignSlotCompetition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [bidInput, setBidInput] = useState("");
  const [raisingBid, setRaisingBid] = useState(false);
  const [raiseBidError, setRaiseBidError] = useState<string | null>(null);
  const [raiseBidMessage, setRaiseBidMessage] = useState<string | null>(null);
  const [autoApproved, setAutoApproved] = useState(false);

  async function load() {
    const res = await fetch(`/api/v1/advertising/campaigns/${campaignId}`, {
      credentials: "same-origin",
    });
    const j = await res.json().catch(() => ({}));
    if (j.success) {
      setCampaign(j.campaign);
      setStats(j.stats ?? null);
      setPacing(j.pacing ?? null);
      setSlotCompetition(j.slotCompetition ?? null);
    } else {
      setError(j.message ?? "Could not load campaign");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  async function handleRaiseBid(e: React.FormEvent) {
    e.preventDefault();
    setRaiseBidError(null);
    setRaiseBidMessage(null);
    setRaisingBid(true);
    try {
      const res = await fetch(`/api/v1/advertising/campaigns/${campaignId}/bid`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxBidCpm: Number(bidInput) }),
      });
      const j = await res.json().catch(() => ({}));
      if (!j.success) {
        setRaiseBidError(j.message ?? "Could not update bid");
        return;
      }
      setRaiseBidMessage("Bid updated. It takes effect on the next auction run, within 15 minutes.");
      await load();
    } finally {
      setRaisingBid(false);
    }
  }

  async function handleSubmitForReview() {
    setActionError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/advertising/campaigns/${campaignId}/submit`, {
        method: "POST",
        credentials: "same-origin",
      });
      const j = await res.json().catch(() => ({}));
      if (!j.success) {
        setActionError(j.message ?? "Could not submit campaign");
        return;
      }
      setCampaign(j.campaign);
      if (j.autoApproved) setAutoApproved(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        {error}
      </div>
    );
  }
  if (!campaign) {
    return <LoadingState size="sm" label="Loading campaign…" />;
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">{campaign.title}</h1>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
            campaign.isArchive ? STATUS_BADGE.archived : (STATUS_BADGE[campaign.status] ?? STATUS_BADGE.draft)
          )}
        >
          {campaign.isArchive ? "archived" : campaign.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          {campaign.isArchive ? (
            <div className="rounded-lg bg-zinc-100 px-4 py-3 text-sm text-zinc-700">
              This campaign has been archived by an admin. It has stopped competing in auctions and
              is no longer serving, even though its underlying status is still &quot;{campaign.status}
              &quot;.
            </div>
          ) : null}

          {campaign.status === "rejected" && campaign.rejectionReason ? (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
              <span className="font-medium">Rejected:</span> {campaign.rejectionReason}
            </div>
          ) : null}

          {autoApproved ? (
            <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <span className="font-medium">Auto-approved:</span> based on your track record, this
              campaign skipped manual review and will go live per its schedule.
            </div>
          ) : null}

          {campaign.refundedAt ? (
            <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <span className="font-medium">Refund issued:</span> Rs.{" "}
              {(campaign.refundAmount ?? 0).toLocaleString()} credited to your wallet on{" "}
              {new Date(campaign.refundedAt).toLocaleDateString()} for undelivered impressions.
            </div>
          ) : null}

          <section className={cn(designTw.publicCard, "space-y-3 p-6 text-sm")}>
            <div className="flex justify-between">
              <span className="text-zinc-500">Placement</span>
              <span className="font-medium text-zinc-900">{placementLabel(campaign.placementType)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Max bid CPM</span>
              <span className="font-medium text-zinc-900">Rs. {campaign.maxBidCpm.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Budget cap</span>
              <span className="font-medium text-zinc-900">Rs. {campaign.budgetCap.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Daily budget</span>
              <span className="font-medium text-zinc-900">
                {campaign.dailyBudget
                  ? `Rs. ${campaign.dailyBudget.toLocaleString()}`
                  : "Auto (budget cap ÷ campaign days)"}
              </span>
            </div>
            {campaign.impressionCap ? (
              <div className="flex justify-between">
                <span className="text-zinc-500">Impression cap</span>
                <span className="font-medium text-zinc-900">
                  {campaign.impressionCap.toLocaleString()}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-zinc-500">Schedule</span>
              <span className="font-medium text-zinc-900">
                {new Date(campaign.startDate).toLocaleDateString()} –{" "}
                {new Date(campaign.endDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Targeting</span>
              <span className="font-medium text-zinc-900">
                {campaign.areaIds.length} area(s), {campaign.projectTypeIds.length} property type(s)
                {campaign.tiers.length ? `, ${campaign.tiers.length} tier(s)` : ""}
              </span>
            </div>
          </section>
          {campaign.status === "draft" ? (
            <section className={cn(designTw.publicCard, "space-y-3 p-6")}>
              {actionError ? <p className="text-sm text-red-700">{actionError}</p> : null}
              <p className="text-sm text-zinc-500">
                This campaign is still a draft. Submit it for admin review once you&apos;re ready.
              </p>
              <Button
                className={designTw.btnPrimary}
                onClick={handleSubmitForReview}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit for review"}
              </Button>
            </section>
          ) : null}
        </div>
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-4">
          {stats ? (
            <section className={cn(designTw.publicCard, "p-6")}>
              <h2 className="mb-4 text-sm font-semibold text-zinc-900">Performance</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-zinc-500">Impressions</p>
                  <p className="mt-1 text-lg font-semibold text-zinc-900">
                    {stats.impressions.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Clicks</p>
                  <p className="mt-1 text-lg font-semibold text-zinc-900">
                    {stats.clicks.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">CTR</p>
                  <p className="mt-1 text-lg font-semibold text-zinc-900">
                    {(stats.ctr * 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Spend</p>
                  <p className="mt-1 text-lg font-semibold text-zinc-900">
                    Rs. {stats.spend.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {pacing ? (
            <section className={cn(designTw.publicCard, "space-y-3 p-6 text-sm")}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-900">Auction insight &amp; pacing</h2>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                    PACING_BADGE[pacing.status]
                  )}
                >
                  {PACING_LABELS[pacing.status]}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Current effective CPM</span>
                <span className="font-medium text-zinc-900">
                  {pacing.currentEffectiveCpm != null
                    ? `Rs. ${pacing.currentEffectiveCpm.toLocaleString()}`
                    : "Not currently winning a slot"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">
                  Delivery pace ({pacing.pacingBasis === "impressions" ? "impressions" : "spend"}/day)
                </span>
                <span className="font-medium text-zinc-900">
                  {pacing.pacingBasis === "impressions"
                    ? `${pacing.actualPace.toFixed(1)} / ${pacing.targetPace.toFixed(1)} target`
                    : `Rs. ${pacing.actualPace.toFixed(2)} / Rs. ${pacing.targetPace.toFixed(2)} target`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Days elapsed</span>
                <span className="font-medium text-zinc-900">
                  {pacing.daysElapsed} / {pacing.totalDays}
                </span>
              </div>
              {slotCompetition ? (
                <>
                  <div className="flex justify-between border-t border-zinc-100 pt-3">
                    <span className="text-zinc-500">Average share of targeted slots</span>
                    <span className="font-medium text-zinc-900">{slotCompetition.avgSharePercent}%</span>
                  </div>
                  {slotCompetition.slotsContesting > 0 ? (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Contested slots</span>
                      <span className="font-medium text-zinc-900">{slotCompetition.slotsContesting}</span>
                    </div>
                  ) : null}
                  {slotCompetition.slotsAtFloorShare > 0 ? (
                    <p className="text-xs text-amber-700">
                      Getting a small share of airtime in {slotCompetition.slotsAtFloorShare} of your
                      targeted slot(s): other campaigns there have significantly more bidding/budget
                      power.
                    </p>
                  ) : null}
                  {campaign.status === "live" && !campaign.isArchive ? (
                    <form
                      onSubmit={handleRaiseBid}
                      className="flex items-end gap-2 border-t border-zinc-100 pt-3"
                    >
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-zinc-500">
                          Raise bid to grow your share (takes effect within 15 minutes)
                        </label>
                        <Input
                          layout="field"
                          type="number"
                          min={1}
                          value={bidInput}
                          onChange={(e) => setBidInput(e.target.value)}
                        />
                      </div>
                      <Button type="submit" className={designTw.btnPrimary} disabled={raisingBid}>
                        {raisingBid ? "Updating…" : "Raise bid"}
                      </Button>
                    </form>
                  ) : null}
                  {raiseBidError ? <p className="text-sm text-red-700">{raiseBidError}</p> : null}
                  {raiseBidMessage ? (
                    <p className="text-sm text-emerald-700">{raiseBidMessage}</p>
                  ) : null}
                </>
              ) : null}
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

export function CampaignDetailClient({ campaignId }: { campaignId: number }) {
  return <CampaignDetailContent campaignId={campaignId} />;
}
