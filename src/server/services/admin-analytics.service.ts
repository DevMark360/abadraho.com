import { prisma } from "@/lib/prisma";
import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { isDatabaseEnabled } from "@/lib/db";
import { jsonNum } from "@/lib/prisma-json";
import { userTypeIds } from "@/config/site";

export type AnalyticsRange = "week" | "month" | "year";

export type AnalyticsPoint = {
  label: string;
  customers: number;
  projects: number;
};

export type PeriodTotals = {
  customers: number;
  projects: number;
};

export type DashboardAnalytics = {
  range: AnalyticsRange;
  points: AnalyticsPoint[];
  periodTotals: {
    week: PeriodTotals;
    month: PeriodTotals;
    year: PeriodTotals;
  };
};

const CUSTOMER_TYPE = userTypeIds.websiteUser;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatDay(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatMonth(d: Date) {
  return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rangeStart(range: AnalyticsRange): Date {
  const now = startOfDay(new Date());
  if (range === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return d;
  }
  if (range === "month") {
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    return d;
  }
  const d = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  return d;
}

async function countInPeriod(
  table: "users" | "projects",
  from: Date,
  extraWhere = "",
  extraParams: unknown[] = []
): Promise<number> {
  const params: unknown[] = [from, ...extraParams];
  let where = "created_at >= ? AND is_archive = 0";
  if (table === "users") {
    where += " AND user_type_id = ?";
    params.push(CUSTOMER_TYPE);
  }
  if (extraWhere) where += ` AND ${extraWhere}`;

  const rows = await queryRaw<{ cnt: bigint }[]>(
    `SELECT COUNT(*) AS cnt FROM ${table} WHERE ${where}`,
    ...params
  );
  return jsonNum(rows[0]?.cnt);
}

function projectScopeClause(projectIds: number[] | undefined): {
  sql: string;
  params: number[];
} {
  if (projectIds === undefined) return { sql: "", params: [] };
  if (!projectIds.length) return { sql: " AND 1=0", params: [] };
  return {
    sql: ` AND id IN (${projectIds.map(() => "?").join(",")})`,
    params: projectIds,
  };
}

async function countProjectsInPeriod(from: Date, projectIds?: number[]): Promise<number> {
  const scope = projectScopeClause(projectIds);
  const rows = await queryRaw<{ cnt: bigint }[]>(
    `SELECT COUNT(*) AS cnt FROM projects WHERE created_at >= ? AND is_archive = 0${scope.sql}`,
    from,
    ...scope.params
  );
  return jsonNum(rows[0]?.cnt);
}

async function seriesByDay(
  from: Date,
  projectIds?: number[]
): Promise<{
  customers: Map<string, number>;
  projects: Map<string, number>;
}> {
  const scope = projectScopeClause(projectIds);
  const customerRows = await queryRaw<
    { d: Date; cnt: bigint }[]
  >(
    `SELECT DATE(created_at) AS d, COUNT(*) AS cnt
     FROM users
     WHERE created_at >= ? AND is_archive = 0 AND user_type_id = ?
     GROUP BY DATE(created_at)`,
    from,
    CUSTOMER_TYPE
  );

  const projectRows = await queryRaw<
    { d: Date; cnt: bigint }[]
  >(
    `SELECT DATE(created_at) AS d, COUNT(*) AS cnt
     FROM projects
     WHERE created_at >= ? AND is_archive = 0${scope.sql}
     GROUP BY DATE(created_at)`,
    from,
    ...scope.params
  );

  const customers = new Map<string, number>();
  const projects = new Map<string, number>();

  for (const r of customerRows) {
    const key = localDateKey(startOfDay(new Date(r.d)));
    customers.set(key, jsonNum(r.cnt));
  }
  for (const r of projectRows) {
    const key = localDateKey(startOfDay(new Date(r.d)));
    projects.set(key, jsonNum(r.cnt));
  }

  return { customers, projects };
}

async function seriesByMonth(
  from: Date,
  projectIds?: number[]
): Promise<{
  customers: Map<string, number>;
  projects: Map<string, number>;
}> {
  const scope = projectScopeClause(projectIds);
  const customerRows = await queryRaw<
    { period: string; cnt: bigint }[]
  >(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS period, COUNT(*) AS cnt
     FROM users
     WHERE created_at >= ? AND is_archive = 0 AND user_type_id = ?
     GROUP BY DATE_FORMAT(created_at, '%Y-%m')
     ORDER BY period ASC`,
    from,
    CUSTOMER_TYPE
  );

  const projectRows = await queryRaw<
    { period: string; cnt: bigint }[]
  >(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS period, COUNT(*) AS cnt
     FROM projects
     WHERE created_at >= ? AND is_archive = 0${scope.sql}
     GROUP BY DATE_FORMAT(created_at, '%Y-%m')
     ORDER BY period ASC`,
    from,
    ...scope.params
  );

  const customers = new Map<string, number>();
  const projects = new Map<string, number>();

  for (const r of customerRows) {
    customers.set(r.period, jsonNum(r.cnt));
  }
  for (const r of projectRows) {
    projects.set(r.period, jsonNum(r.cnt));
  }

  return { customers, projects };
}

function buildDayPoints(
  from: Date,
  days: number,
  customers: Map<string, number>,
  projects: Map<string, number>
): AnalyticsPoint[] {
  const points: AnalyticsPoint[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const key = localDateKey(d);
    points.push({
      label: formatDay(d),
      customers: customers.get(key) ?? 0,
      projects: projects.get(key) ?? 0,
    });
  }
  return points;
}

function buildMonthPoints(
  from: Date,
  months: number,
  customers: Map<string, number>,
  projects: Map<string, number>
): AnalyticsPoint[] {
  const points: AnalyticsPoint[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    points.push({
      label: formatMonth(d),
      customers: customers.get(key) ?? 0,
      projects: projects.get(key) ?? 0,
    });
  }
  return points;
}

// ─── Per-stat-card trend (sparkline + week-over-week %) ───────────────────────

export type StatTrend = {
  key: string;
  sparkline: number[]; // 14 days, oldest → newest
  weekOverWeekPercent: number | null; // null = no prior-week activity to compare against
};

type StatTrendConfig = {
  key: string;
  table: string;
  whereSql: string;
  whereParams: unknown[];
  /** Builder dashboards only show projects/units/inquiries — scope those by owned project ids. */
  scopedColumn?: "id" | "project_id";
};

const STAT_TREND_CONFIGS: StatTrendConfig[] = [
  { key: "projects", table: "projects", whereSql: "is_archive = 0", whereParams: [], scopedColumn: "id" },
  { key: "units", table: "units", whereSql: "is_archive = 0", whereParams: [], scopedColumn: "project_id" },
  {
    key: "customers",
    table: "users",
    whereSql: "user_type_id = ? AND is_archive = 0",
    whereParams: [CUSTOMER_TYPE],
  },
  { key: "inquiries", table: "inquiries", whereSql: "", whereParams: [], scopedColumn: "project_id" },
  { key: "blogs", table: "blog", whereSql: "", whereParams: [] },
  { key: "reviews", table: "reviews", whereSql: "", whereParams: [] },
  { key: "contacts", table: "contactus", whereSql: "", whereParams: [] },
  { key: "brokers", table: "brokers", whereSql: "is_archive = 0", whereParams: [] },
];

const TREND_DAYS = 14;

async function computeStatTrend(
  config: StatTrendConfig,
  builderProjectIds?: number[]
): Promise<StatTrend> {
  const flat: StatTrend = { key: config.key, sparkline: Array(TREND_DAYS).fill(0), weekOverWeekPercent: null };

  // A builder-scoped dashboard only trends the metrics it can actually scope by project;
  // everything else (customers, blogs, reviews, contacts, brokers) is platform-wide only.
  if (builderProjectIds !== undefined && !config.scopedColumn) return flat;
  if (builderProjectIds !== undefined && !builderProjectIds.length) return flat;

  const now = startOfDay(new Date());
  const from = new Date(now);
  from.setDate(from.getDate() - (TREND_DAYS - 1));

  const conditions = ["created_at >= ?"];
  const params: unknown[] = [from];
  if (config.whereSql) {
    conditions.push(config.whereSql);
    params.push(...config.whereParams);
  }
  if (builderProjectIds !== undefined && config.scopedColumn) {
    conditions.push(`${config.scopedColumn} IN (${builderProjectIds.map(() => "?").join(",")})`);
    params.push(...builderProjectIds);
  }

  try {
    const rows = await queryRaw<{ d: Date; cnt: bigint }[]>(
      `SELECT DATE(created_at) AS d, COUNT(*) AS cnt
       FROM ${config.table}
       WHERE ${conditions.join(" AND ")}
       GROUP BY DATE(created_at)`,
      ...params
    );

    const byDay = new Map<string, number>();
    for (const r of rows) {
      byDay.set(localDateKey(startOfDay(new Date(r.d))), jsonNum(r.cnt));
    }

    const sparkline: number[] = [];
    for (let i = 0; i < TREND_DAYS; i++) {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      sparkline.push(byDay.get(localDateKey(d)) ?? 0);
    }

    const thisWeek = sparkline.slice(7, 14).reduce((s, v) => s + v, 0);
    const lastWeek = sparkline.slice(0, 7).reduce((s, v) => s + v, 0);
    const weekOverWeekPercent =
      lastWeek === 0 ? null : Math.round(((thisWeek - lastWeek) / lastWeek) * 100);

    return { key: config.key, sparkline, weekOverWeekPercent };
  } catch {
    return flat;
  }
}

export async function getStatCardTrends(
  builderProjectIds?: number[]
): Promise<Record<string, StatTrend>> {
  if (!isDatabaseEnabled()) return {};
  const results = await Promise.all(
    STAT_TREND_CONFIGS.map((config) => computeStatTrend(config, builderProjectIds))
  );
  const byKey: Record<string, StatTrend> = {};
  for (const r of results) byKey[r.key] = r;
  return byKey;
}

export async function getDashboardAnalytics(
  range: AnalyticsRange = "month",
  builderProjectIds?: number[]
): Promise<DashboardAnalytics> {
  const empty: DashboardAnalytics = {
    range,
    points: [],
    periodTotals: {
      week: { customers: 0, projects: 0 },
      month: { customers: 0, projects: 0 },
      year: { customers: 0, projects: 0 },
    },
  };

  if (!isDatabaseEnabled()) return empty;

  try {
    const now = startOfDay(new Date());
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = new Date(now);
    monthStart.setDate(monthStart.getDate() - 29);
    const yearStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const isBuilderScope = builderProjectIds !== undefined;

    const [weekCustomers, weekProjects, monthCustomers, monthProjects, yearCustomers, yearProjects] =
      await Promise.all([
        isBuilderScope ? Promise.resolve(0) : countInPeriod("users", weekStart),
        countProjectsInPeriod(weekStart, builderProjectIds),
        isBuilderScope ? Promise.resolve(0) : countInPeriod("users", monthStart),
        countProjectsInPeriod(monthStart, builderProjectIds),
        isBuilderScope ? Promise.resolve(0) : countInPeriod("users", yearStart),
        countProjectsInPeriod(yearStart, builderProjectIds),
      ]);

    const periodTotals = {
      week: { customers: weekCustomers, projects: weekProjects },
      month: { customers: monthCustomers, projects: monthProjects },
      year: { customers: yearCustomers, projects: yearProjects },
    };

    let points: AnalyticsPoint[] = [];

    if (range === "week") {
      const { customers, projects } = await seriesByDay(weekStart, builderProjectIds);
      points = buildDayPoints(weekStart, 7, customers, projects);
    } else if (range === "month") {
      const { customers, projects } = await seriesByDay(monthStart, builderProjectIds);
      points = buildDayPoints(monthStart, 30, customers, projects);
    } else {
      const { customers, projects } = await seriesByMonth(yearStart, builderProjectIds);
      points = buildMonthPoints(yearStart, 12, customers, projects);
    }

    return { range, points, periodTotals };
  } catch {
    return empty;
  }
}
