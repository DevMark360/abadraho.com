/**
 * Shared auction-ranking core — used by BOTH the standalone cron script
 * (scripts/run-ad-auction.mjs, run via plain `node`, no bundler/TS available) and the Next.js
 * app (for the targeted instant-recompute path triggered when a builder raises their bid).
 * Plain JS on purpose — no TypeScript-only syntax — so the cron script can import it directly
 * without a build step, while the Next.js side still gets type inference via `allowJs`.
 *
 * Keeping this logic in exactly one place matters: a real Phase 1 bug happened because the
 * slot-combination logic diverged between where it was generated and where it was assumed to
 * work — see slotCombinationsForCampaign's own comment below.
 */

export const ANY = "any";

/** 20 min — slightly longer than the 15-min cron cadence, so a slow/missed run doesn't blank a slot early. */
export const SLOT_VALIDITY_MS = 20 * 60 * 1000;

// Legacy coarse CTR-band multiplier (band 3 = neutral, matches AdCampaign.ctrBand default).
// Kept only for backward-compat reference — ranking uses the continuous Quality Score below.
export const CTR_BAND_MULTIPLIER = { 1: 0.7, 2: 0.85, 3: 1.0, 4: 1.15, 5: 1.3 };

// Cold-start guard: don't move a campaign off the neutral default until it has enough
// impressions for CTR to mean anything (shared by both the legacy band and the Quality Score).
export const MIN_IMPRESSIONS_FOR_BAND = 100;

export function bandForCtr(ctr) {
  if (ctr < 0.005) return 1;
  if (ctr < 0.01) return 2;
  if (ctr < 0.02) return 3;
  if (ctr < 0.04) return 4;
  return 5;
}

// Quality Score (Phase 3): a continuous multiplier derived from a campaign's own click-through
// rate, replacing the old 5-bucket band so ranking shifts smoothly as real performance changes
// instead of jumping between 5 fixed steps. Same floor/ceiling as the old band's extremes
// (0.7x-1.3x), just interpolated continuously between them rather than snapped to one of 5
// values.
const QUALITY_MIN_MULTIPLIER = 0.7;
const QUALITY_MAX_MULTIPLIER = 1.3;
const QUALITY_CTR_CEILING = 0.05; // CTR at or above 5% maps to the max multiplier

export function computeQualityScore(impressions, clicks) {
  if (impressions < MIN_IMPRESSIONS_FOR_BAND) return 1.0; // not enough data yet — stay neutral
  const ctr = clicks / impressions;
  const t = Math.min(1, Math.max(0, ctr / QUALITY_CTR_CEILING));
  return QUALITY_MIN_MULTIPLIER + t * (QUALITY_MAX_MULTIPLIER - QUALITY_MIN_MULTIPLIER);
}

export function slotKey(placementType, areaId, projectTypeId, tier) {
  return `${placementType}:${areaId ?? ANY}:${projectTypeId ?? ANY}:${tier ?? ANY}`;
}

/**
 * Slot combinations a campaign competes for. Most real pages only have ONE (or two)
 * targeting dimensions available at render time (e.g. an area page knows the area but not
 * a property type or tier) — a page never queries a slot key it can't fully specify. So a
 * campaign that targets multiple dimensions (area/property-type/tier) needs to register a
 * slot for every non-empty subset of its targeted dimensions — not just the fully-specific
 * cross-product — otherwise it would only ever be eligible on a page that knows every
 * targeted dimension simultaneously, which most pages don't (this was a real Phase 1 bug:
 * a campaign targeting both areas and types never won on single-dimension pages until this
 * subset expansion was added). This does mean a single-dimension page treats a
 * "DHA + Apartments" bidder the same as a "DHA, any type" bidder for ranking purposes on
 * that page — an acceptable simplification, not a specificity-weighted match.
 */
export function slotCombinationsForCampaign(campaign) {
  const dims = [
    { field: "areaId", values: campaign.areas.map((a) => a.areaId.toString()) },
    { field: "projectTypeId", values: campaign.projectTypes.map((t) => t.projectTypeId) },
    { field: "tier", values: campaign.tiers.map((t) => t.tier) },
  ].filter((d) => d.values.length > 0);

  const combos = new Map();
  const add = (partial) => {
    const areaId = partial.areaId ?? null;
    const projectTypeId = partial.projectTypeId ?? null;
    const tier = partial.tier ?? null;
    combos.set(`${areaId ?? ANY}:${projectTypeId ?? ANY}:${tier ?? ANY}`, {
      areaId,
      projectTypeId,
      tier,
    });
  };

  // Every campaign — targeted or not — is always eligible for the fully-wildcard slot (e.g.
  // the homepage's broad placements), so targeting specific areas/types never costs a campaign
  // its shot at homepage reach.
  add({});

  // Every non-empty subset of the targeted dimensions gets its own cross-product of slots,
  // so a campaign is eligible regardless of which subset of dimensions a given page knows.
  for (let mask = 1; mask < 1 << dims.length; mask++) {
    let partials = [{}];
    for (let i = 0; i < dims.length; i++) {
      if (!(mask & (1 << i))) continue;
      const dim = dims[i];
      const next = [];
      for (const p of partials) {
        for (const value of dim.values) {
          next.push({ ...p, [dim.field]: value });
        }
      }
      partials = next;
    }
    for (const p of partials) add(p);
  }

  return [...combos.values()];
}

export function findFloorCpm(floorPrices, placementType, areaId, projectTypeId) {
  // Most specific match wins: area+type > area-only > type-only > global default.
  const candidates = [
    { areaId, projectTypeId },
    { areaId, projectTypeId: null },
    { areaId: null, projectTypeId },
    { areaId: null, projectTypeId: null },
  ];
  for (const c of candidates) {
    const match = floorPrices.find(
      (f) =>
        f.placementType === placementType &&
        (f.areaId?.toString() ?? null) === (c.areaId ?? null) &&
        (f.projectTypeId ?? null) === (c.projectTypeId ?? null)
    );
    if (match) return Number(match.floorCpm);
  }
  return 0; // No floor configured for this slot — any qualifying bid wins.
}

export function effectiveRank(maxBidCpm, qualityScore) {
  return Number(maxBidCpm) * Number(qualityScore ?? 1.0);
}

// ─── Time-shared rotation (replaces winner-take-all) ──────────────────────────
// Instead of one campaign owning a slot outright, every eligible campaign gets a proportional
// slice of a fixed cycle, so a smaller bidder still gets real airtime instead of zero. See
// docs/ADVERTISING_PORTAL_DEPLOYMENT.md's rotation milestones for the full design rationale.

/** Length of one full rotation cycle for a slot. */
export const ROTATION_CYCLE_SECONDS = 60;

/** Smallest slice a participating campaign can be allocated — everyone gets at least a token
 * amount of airtime, not squeezed to zero by a much bigger bidder. Self-limiting in the extreme
 * case of many simultaneous participants in one slot — see allocateSlotSeconds. */
export const MIN_SLICE_SECONDS = 2;

/** Floor for deriving a daily budget from budgetCap when a campaign has none set explicitly —
 * avoids a division blow-up for a same-day start/end campaign. */
export const MIN_CAMPAIGN_DURATION_DAYS = 1;

/** Shared tag written to AdCampaign.pausedReason when the cron pauses a campaign for exhausting
 * its daily budget — lets the auto-resume step only resume pauses it caused itself. */
export const DAILY_BUDGET_PAUSE_REASON = "daily_budget_exhausted";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** A campaign's effective daily spend cap — its own dailyBudget if set, else budgetCap spread
 * evenly across its scheduled duration in days. */
export function resolveDailyBudget(campaign) {
  if (campaign.dailyBudget != null) return Number(campaign.dailyBudget);
  const durationMs = new Date(campaign.endDate).getTime() - new Date(campaign.startDate).getTime();
  const durationDays = Math.max(MIN_CAMPAIGN_DURATION_DAYS, Math.ceil(durationMs / MS_PER_DAY));
  return Number(campaign.budgetCap) / durationDays;
}

/** Rotation weight — reuses effectiveRank (bid × quality) so this never diverges from the
 * existing ranking term, multiplied by daily spending power so a high bidder with a tiny daily
 * budget doesn't dominate the cycle. */
export function campaignWeight(maxBidCpm, qualityScore, dailyBudget) {
  return effectiveRank(maxBidCpm, qualityScore) * Number(dailyBudget);
}

/**
 * Splits a fixed cycle between every entry proportional to weight, using the largest-remainder
 * method so shares always sum to exactly cycleSeconds. Every entry gets at least `minSeconds` —
 * unless there are so many simultaneous participants that even one second each would exceed the
 * cycle, in which case the floor shrinks (self-limiting: with far more participants than seconds
 * in the cycle, the lowest-weight entries correctly end up with zero and are dropped from the
 * result, rather than the algorithm going negative).
 */
export function allocateSlotSeconds(entries, options = {}) {
  const cycleSeconds = options.cycleSeconds ?? ROTATION_CYCLE_SECONDS;
  const minSeconds = options.minSeconds ?? MIN_SLICE_SECONDS;

  const n = entries.length;
  if (n === 0) return [];
  if (n === 1) return [{ campaignId: entries[0].campaignId, shareSeconds: cycleSeconds }];

  // Guaranteed floor * n <= cycleSeconds — never goes negative even in the degenerate case of
  // more participants than seconds in the cycle.
  const floor = Math.min(minSeconds, Math.floor(cycleSeconds / n));
  const remaining = cycleSeconds - floor * n;

  const totalWeight = entries.reduce((sum, e) => sum + Number(e.weight), 0);
  const useEqualSplit = totalWeight <= 0; // shouldn't happen — bid/quality/dailyBudget are all >0 — but guard anyway

  const withBase = entries.map((e) => {
    const raw = useEqualSplit ? remaining / n : (remaining * Number(e.weight)) / totalWeight;
    const base = Math.floor(raw);
    return { campaignId: e.campaignId, base, remainder: raw - base };
  });

  const allocated = withBase.reduce((sum, e) => sum + e.base, 0);
  const leftover = remaining - allocated;

  // Hand out the whole-second remainder to the highest-remainder entries first, tie-break by
  // campaignId ascending for determinism (same cron run, same input, same output — no flakiness).
  const byRemainder = [...withBase].sort((a, b) =>
    b.remainder !== a.remainder ? b.remainder - a.remainder : a.campaignId - b.campaignId
  );
  for (let i = 0; i < leftover; i++) {
    byRemainder[i % byRemainder.length].base += 1;
  }

  return withBase
    .map((e) => ({ campaignId: e.campaignId, shareSeconds: floor + e.base }))
    .filter((e) => e.shareSeconds > 0);
}
