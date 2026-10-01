/**
 * Advertising Portal — Phase 1 periodic auction.
 * Usage:  node scripts/run-ad-auction.mjs
 *
 * Simplified periodic ranking (see docs/ADVERTISING_PORTAL_PRD.md §8, §15 Phase 1):
 * ranks live/approved campaigns per (placementType, areaId, projectTypeId) slot by
 * effectiveRank = maxBidCpm × ctrBandMultiplier, applies any admin floor price, and
 * writes the winner per slot into AdSlotWinner. Meant to run on a schedule (e.g.
 * hourly via cPanel's Cron Jobs UI) — see the implementation plan for why this is a
 * standalone script rather than an in-process timer (server.js runs under Phusion
 * Passenger with deliberately minimal background resource use).
 *
 * Public pages read AdSlotWinner directly (see Milestone 6) — no auction math ever
 * runs on the request path.
 */

import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SLOT_VALIDITY_MS,
  MIN_IMPRESSIONS_FOR_BAND,
  bandForCtr,
  computeQualityScore,
  slotKey,
  slotCombinationsForCampaign,
  findFloorCpm,
  effectiveRank,
  resolveDailyBudget,
  campaignWeight,
  allocateSlotSeconds,
  DAILY_BUDGET_PAUSE_REASON,
  MIN_SLICE_SECONDS,
} from "../src/lib/ad-auction-core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ─── Load .env ───────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

function createPrisma() {
  const require = createRequire(import.meta.url);
  const { PrismaClient } = require("@prisma/client");
  const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.includes("mysql")) {
    throw new Error("DATABASE_URL (mysql) is required");
  }

  const url = new URL(databaseUrl);
  const config = {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: 2,
  };

  const adapter = new PrismaMariaDb(config);
  return new PrismaClient({ adapter, log: ["error"] });
}

const LOSING_NOTIFICATION_THROTTLE_HOURS = 6;

/** Mirrors ad-serving.service.ts's startOfToday() — see its comment for why this must be
 * UTC-midnight-of-local-Y/M/D, not setHours(0,0,0,0), to match how spend actually gets bucketed. */
function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/** A campaign is flagged as "low share" in a slot when it's stuck at (or near) the guaranteed
 * floor while some other participant there has a materially bigger slice — there's no single
 * winner/loser cliff anymore under proportional rotation, so this replaces the old binary check. */
const LOW_SHARE_COMPETITOR_MULTIPLIER = 2;

/**
 * Builders previously had zero visibility into competing bids — under proportional rotation the
 * equivalent gap is a campaign stuck with a tiny slice of the cycle while a competitor holds a
 * much bigger one. Throttled so a persistently low-share campaign doesn't get notified every
 * single 15-minute cycle.
 */
async function notifyLowShareCampaigns(prisma, campaigns, allocationsBySlot) {
  let notified = 0;
  for (const campaign of campaigns) {
    try {
      let lowShareCount = 0;
      let strongestCompetitorWeight = null;

      for (const { areaId, projectTypeId, tier } of slotCombinationsForCampaign(campaign)) {
        const key = slotKey(campaign.placementType, areaId, projectTypeId, tier);
        const rows = allocationsBySlot.get(key);
        if (!rows) continue;

        const mine = rows.find((r) => r.campaignId === campaign.id);
        if (!mine) continue; // didn't clear the floor price here at all — a different signal, not "low share"

        const others = rows.filter((r) => r.campaignId !== campaign.id);
        if (others.length === 0) continue; // no competition in this slot — full share by definition

        const maxOtherShare = Math.max(...others.map((r) => r.shareSeconds));
        if (mine.shareSeconds <= MIN_SLICE_SECONDS && maxOtherShare > mine.shareSeconds * LOW_SHARE_COMPETITOR_MULTIPLIER) {
          lowShareCount++;
          const maxOtherWeight = Math.max(...others.map((r) => r.weight));
          if (strongestCompetitorWeight == null || maxOtherWeight > strongestCompetitorWeight) {
            strongestCompetitorWeight = maxOtherWeight;
          }
        }
      }

      if (lowShareCount === 0) continue;

      const link = `/advertising/campaigns/${campaign.id}`;
      const recent = await prisma.$queryRawUnsafe(
        `SELECT id FROM notifications WHERE recipient_type = 'builder' AND recipient_id = ? AND type = 'ad_campaign_losing_auction' AND link = ? AND created_at >= (NOW() - INTERVAL ${LOSING_NOTIFICATION_THROTTLE_HOURS} HOUR) LIMIT 1`,
        campaign.builderId,
        link
      );
      if (recent.length > 0) continue; // already notified recently, don't spam every cycle

      await prisma.$executeRawUnsafe(
        `INSERT INTO notifications (recipient_type, recipient_id, actor_type, actor_id, type, title, message, link, is_read, created_at)
         VALUES ('builder', ?, NULL, NULL, 'ad_campaign_losing_auction', ?, ?, ?, 0, NOW(3))`,
        campaign.builderId,
        "Your campaign is getting a small share of airtime",
        `Your campaign "${campaign.title}" is only getting a small share of airtime in ${lowShareCount} of its targeted ad slot(s) — other campaigns there have significantly more bidding/budget power. Raise your max bid or daily budget to grow your share.`,
        link
      );
      notified++;
    } catch (err) {
      console.error(`   ⚠️  Could not send low-share notification for campaign #${campaign.id}:`, err.message);
    }
  }
  if (notified > 0) {
    console.log(`   📣  Notified ${notified} builder(s) about low rotation share.`);
  }
}

async function main() {
  console.log(`\n📢  Ad auction run — ${new Date().toISOString()}`);

  const prisma = createPrisma();
  const now = new Date();

  try {
    // 1. Approved campaigns entering their active window become "live".
    const activatedCount = await prisma.adCampaign.updateMany({
      where: { status: "approved", isArchive: false, startDate: { lte: now }, endDate: { gte: now } },
      data: { status: "live" },
    });
    if (activatedCount.count > 0) {
      console.log(`   Activated ${activatedCount.count} campaign(s) to "live".`);
    }

    const today = startOfToday();

    // 1.4. Resume campaigns paused for yesterday's (or earlier) daily-budget exhaustion — a new
    // calendar day means a fresh daily budget. Only resumes pauses this cron itself caused
    // (pausedReason check) — never touches a campaign paused for some other, future reason.
    const resumedCount = await prisma.adCampaign.updateMany({
      where: {
        status: "paused",
        pausedReason: DAILY_BUDGET_PAUSE_REASON,
        pausedDate: { lt: today },
      },
      data: { status: "live", pausedReason: null, pausedDate: null },
    });
    if (resumedCount.count > 0) {
      console.log(`   Resumed ${resumedCount.count} campaign(s) from daily-budget pause.`);
    }

    // 1.45. Pause live campaigns that have exhausted their daily budget for today — dropped from
    // rotation for the rest of the calendar day only, not lifetime-completed like the exhaustion
    // check below. AdSlotAllocation rows aren't touched here; the next "load live campaigns" step
    // already excludes paused campaigns, and stale allocation rows self-expire via their TTL.
    const liveForDailyCheck = await prisma.adCampaign.findMany({
      where: { status: "live", isArchive: false },
      select: { id: true, dailyBudget: true, budgetCap: true, startDate: true, endDate: true },
    });
    if (liveForDailyCheck.length > 0) {
      const todaysSpend = await prisma.adDailyStat.groupBy({
        by: ["campaignId"],
        where: { campaignId: { in: liveForDailyCheck.map((c) => c.id) }, date: today },
        _sum: { spend: true },
      });
      const todaysSpendMap = new Map(todaysSpend.map((s) => [s.campaignId, Number(s._sum.spend ?? 0)]));

      const dailyPausedIds = [];
      for (const c of liveForDailyCheck) {
        const spendToday = todaysSpendMap.get(c.id) ?? 0;
        if (spendToday >= resolveDailyBudget(c)) dailyPausedIds.push(c.id);
      }
      if (dailyPausedIds.length > 0) {
        await prisma.adCampaign.updateMany({
          where: { id: { in: dailyPausedIds } },
          data: { status: "paused", pausedReason: DAILY_BUDGET_PAUSE_REASON, pausedDate: today },
        });
        console.log(`   Daily-budget-paused ${dailyPausedIds.length} campaign(s) for the rest of today.`);
      }
    }

    // 1.5. Auto-stop exhausted campaigns (budget cap, impression cap, or end date passed) — must
    // also check daily-paused campaigns, not just "live" ones, otherwise a campaign cycling
    // through daily pauses could sail past its lifetime budgetCap/impressionCap unnoticed.
    const liveCampaigns = await prisma.adCampaign.findMany({
      where: { status: { in: ["live", "paused"] } },
      select: { id: true, budgetCap: true, impressionCap: true, endDate: true },
    });
    if (liveCampaigns.length > 0) {
      const spendByCampaign = await prisma.adDailyStat.groupBy({
        by: ["campaignId"],
        where: { campaignId: { in: liveCampaigns.map((c) => c.id) } },
        _sum: { spend: true, impressions: true },
      });
      const spendMap = new Map(
        spendByCampaign.map((s) => [s.campaignId, { spend: Number(s._sum.spend ?? 0), impressions: s._sum.impressions ?? 0 }])
      );

      const exhaustedIds = [];
      for (const c of liveCampaigns) {
        const agg = spendMap.get(c.id) ?? { spend: 0, impressions: 0 };
        const pastEndDate = c.endDate < now;
        const overBudget = agg.spend >= Number(c.budgetCap);
        const overImpressionCap = c.impressionCap != null && agg.impressions >= c.impressionCap;
        if (pastEndDate || overBudget || overImpressionCap) exhaustedIds.push(c.id);
      }
      if (exhaustedIds.length > 0) {
        await prisma.adCampaign.updateMany({
          where: { id: { in: exhaustedIds } },
          data: { status: "completed", pausedReason: null, pausedDate: null },
        });
        // Stop serving immediately rather than waiting for the slot to naturally expire —
        // otherwise an already-exhausted campaign could keep accruing spend for up to
        // SLOT_VALIDITY_MS longer.
        await prisma.adSlotWinner.deleteMany({ where: { campaignId: { in: exhaustedIds } } });
        await prisma.adSlotAllocation.deleteMany({ where: { campaignId: { in: exhaustedIds } } });
        console.log(`   Completed ${exhaustedIds.length} exhausted campaign(s).`);
      }
    }

    // 2. Load all currently-live campaigns within their active window.
    const campaigns = await prisma.adCampaign.findMany({
      where: { status: "live", isArchive: false, startDate: { lte: now }, endDate: { gte: now } },
      include: { areas: true, projectTypes: true, tiers: true },
    });
    console.log(`   Live campaigns in window: ${campaigns.length}`);

    if (campaigns.length === 0) {
      console.log("   No live campaigns — nothing to rank.\n");
      return;
    }

    // 2.5. Recompute each campaign's Quality Score (continuous) from its accumulated daily
    // stats — this is what ranking actually uses now. The legacy ctrBand is still updated
    // alongside it purely for backward-compat display; it plays no role in ranking anymore.
    let scoresUpdated = 0;
    for (const campaign of campaigns) {
      const agg = await prisma.adDailyStat.aggregate({
        where: { campaignId: campaign.id },
        _sum: { impressions: true, clicks: true },
      });
      const impressions = agg._sum.impressions ?? 0;
      const clicks = agg._sum.clicks ?? 0;
      if (impressions < MIN_IMPRESSIONS_FOR_BAND) continue; // not enough data yet — keep current score

      const score = computeQualityScore(impressions, clicks);
      const band = bandForCtr(clicks / impressions);
      if (score !== Number(campaign.qualityScore) || band !== campaign.ctrBand) {
        await prisma.adCampaign.update({
          where: { id: campaign.id },
          data: { qualityScore: score, ctrBand: band },
        });
        campaign.qualityScore = score; // keep the in-memory copy fresh for ranking below
        campaign.ctrBand = band;
        scoresUpdated++;
      }
    }
    if (scoresUpdated > 0) {
      console.log(`   Recomputed Quality Score for ${scoresUpdated} campaign(s).`);
    }

    const floorPrices = await prisma.adFloorPrice.findMany();

    // 3. Collect every eligible campaign per slot (no longer keeping just the single best rank —
    // every campaign that clears the floor price competes for a proportional share instead).
    const entriesBySlot = new Map();
    for (const campaign of campaigns) {
      const bid = Number(campaign.maxBidCpm);
      const weight = campaignWeight(bid, campaign.qualityScore, resolveDailyBudget(campaign));

      for (const { areaId, projectTypeId, tier } of slotCombinationsForCampaign(campaign)) {
        const floorCpm = findFloorCpm(floorPrices, campaign.placementType, areaId, projectTypeId);
        if (bid < floorCpm) continue; // doesn't clear the floor for this slot

        const key = slotKey(campaign.placementType, areaId, projectTypeId, tier);
        if (!entriesBySlot.has(key)) entriesBySlot.set(key, []);
        entriesBySlot.get(key).push({ campaignId: campaign.id, weight, effectiveCpm: bid });
      }
    }

    // 3.5. Allocate each slot's 60-second rotation cycle proportionally among its entries.
    const allocationsBySlot = new Map();
    let totalRows = 0;
    for (const [key, entries] of entriesBySlot) {
      const shares = allocateSlotSeconds(entries.map((e) => ({ campaignId: e.campaignId, weight: e.weight })));
      const shareByCampaign = new Map(shares.map((s) => [s.campaignId, s.shareSeconds]));
      const rows = entries
        .filter((e) => shareByCampaign.has(e.campaignId))
        .map((e) => ({
          campaignId: e.campaignId,
          weight: e.weight,
          effectiveCpm: e.effectiveCpm,
          shareSeconds: shareByCampaign.get(e.campaignId),
        }));
      allocationsBySlot.set(key, rows);
      totalRows += rows.length;
    }

    console.log(`   Slots allocated: ${entriesBySlot.size} (${totalRows} total campaign-slot rows)`);

    // 4. Persist allocations — batched (one delete + one insert), not per-slot, since rotation
    // produces far more rows than the old 1-row-per-slot table and this must stay light for the
    // minInstances:1 Passenger constraint.
    const validUntil = new Date(now.getTime() + SLOT_VALIDITY_MS);
    const encounteredSlotKeys = [...allocationsBySlot.keys()];
    const allRows = [];
    for (const [key, rows] of allocationsBySlot) {
      for (const row of rows) {
        allRows.push({
          slotKey: key,
          campaignId: row.campaignId,
          effectiveCpm: row.effectiveCpm,
          weight: row.weight,
          shareSeconds: row.shareSeconds,
          computedAt: now,
          validUntil,
        });
      }
    }
    if (encounteredSlotKeys.length > 0) {
      await prisma.$transaction([
        prisma.adSlotAllocation.deleteMany({ where: { slotKey: { in: encounteredSlotKeys } } }),
        prisma.adSlotAllocation.createMany({ data: allRows }),
      ]);
    }

    console.log(`   ✅  Wrote ${allRows.length} allocation row(s), valid until ${validUntil.toISOString()}\n`);

    // 5. Notify builders whose live campaigns are stuck with a low share in at least one slot.
    await notifyLowShareCampaigns(prisma, campaigns, allocationsBySlot);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("❌  Fatal:", err);
  process.exit(1);
});
