import { unstable_cache } from "next/cache";
import { isDatabaseEnabled } from "@/lib/db";
import { queryRaw } from "@/lib/prisma-raw";

/**
 * Market figures for the home buyer's guide, computed from AbadRaho's own live listings.
 * Percentages and medians only (never project counts, which go stale in copied text).
 * Every figure is null until enough projects carry the field.
 */
export type HomeListingStats = {
  /** Median down payment as % of unit price (per-project median, then median across projects). */
  medianDownPaymentPct: number | null;
  /** Median installment plan length in months. */
  medianPlanMonths: number | null;
  /** % of listed projects still at pre-launch or under construction (i.e. off-plan). */
  offPlanSharePct: number | null;
  /** % of projects with a published plan whose plan runs 3 years or longer. */
  longPlanSharePct: number | null;
};

const EMPTY: HomeListingStats = {
  medianDownPaymentPct: null,
  medianPlanMonths: null,
  offPlanSharePct: null,
  longPlanSharePct: null,
};

/** Fewer projects than this and a figure says more about one developer than the market. */
const MIN_PROJECTS = 5;

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

const pct = (part: number, whole: number) => Math.round((part / whole) * 100);

export async function computeHomeListingStats(): Promise<HomeListingStats> {
  if (!isDatabaseEnabled()) return EMPTY;
  try {
    const [projects, units] = await Promise.all([
      queryRaw<{ months: number | bigint | null; stage: string | null }[]>(
        `SELECT p.installment_length AS months, ps.progress_status_name AS stage
         FROM projects p
         LEFT JOIN progress_status ps ON ps.id = p.progress_status_id
         WHERE p.is_archive = 0 AND p.status = 1`
      ),
      // Ratios outside 2-90% are data-entry slips (e.g. down payment = full price), not plans.
      queryRaw<{ projectId: number | bigint; ratio: number | string }[]>(
        `SELECT u.project_id AS projectId, u.down_payment / u.price AS ratio
         FROM units u
         JOIN projects p ON p.id = u.project_id
         WHERE p.is_archive = 0 AND p.status = 1 AND u.is_archive = 0
           AND u.price > 0 AND u.down_payment > 0
           AND u.down_payment / u.price BETWEEN 0.02 AND 0.9`
      ),
    ]);

    const byProject = new Map<number, number[]>();
    for (const u of units) {
      const id = Number(u.projectId);
      const list = byProject.get(id) ?? [];
      list.push(Number(u.ratio));
      byProject.set(id, list);
    }
    const projectDp = [...byProject.values()]
      .map((r) => median(r))
      .filter((v): v is number => v != null);
    const dp = projectDp.length >= MIN_PROJECTS ? median(projectDp) : null;

    const months = projects
      .map((p) => Number(p.months ?? 0))
      .filter((m) => m > 0 && m <= 240);
    const enoughPlans = months.length >= MIN_PROJECTS;

    const staged = projects.map((p) => p.stage?.trim().toLowerCase()).filter(Boolean) as string[];
    const offPlan = staged.filter((s) => /pre[\s-]?launch|under[\s-]?construction/.test(s));

    return {
      medianDownPaymentPct: dp != null ? Math.round(dp * 100) : null,
      medianPlanMonths: enoughPlans ? Math.round(median(months)!) : null,
      offPlanSharePct: staged.length >= MIN_PROJECTS ? pct(offPlan.length, staged.length) : null,
      longPlanSharePct: enoughPlans ? pct(months.filter((m) => m >= 36).length, months.length) : null,
    };
  } catch (err) {
    // The guide reads fine without figures; never fail the home page over them.
    console.error("[home-stats] failed", err);
    return EMPTY;
  }
}

/** Cached for an hour: medians barely move, and the home page stays fast. */
export const getHomeListingStats = unstable_cache(computeHomeListingStats, ["home-listing-stats"], {
  revalidate: 3600,
  tags: ["projects-list"],
});
