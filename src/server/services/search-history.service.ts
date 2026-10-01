import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { jsonNum, jsonNumOrNull } from "@/lib/prisma-json";
import { loadAreaNamesByProjectIds } from "@/server/services/project-area.service";
import type { SessionUser } from "@/lib/session";

export type ActivityPayload = {
  project_id?: number | null;
  projectId?: number | null;
  area?: string | null;
  min_price?: number | null;
  minPrice?: number | null;
  max_price?: number | null;
  maxPrice?: number | null;
  created_at?: string | null;
};

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function normalizeEntry(raw: ActivityPayload) {
  return {
    projectId: num(raw.project_id ?? raw.projectId),
    area: str(raw.area),
    minPrice: num(raw.min_price ?? raw.minPrice),
    maxPrice: num(raw.max_price ?? raw.maxPrice),
    createdAt: raw.created_at ? new Date(raw.created_at) : new Date(),
  };
}

/** A visited project's own area(s) — so "Target location" reflects projects actually opened,
 * not only explicit area-filter searches. Same join-then-fallback-to-single-location pattern
 * used for project listings (project.service.ts) — most projects carry their area via the
 * project_area junction, not the sparsely-populated Project.areaId column. */
async function resolveProjectAreaNames(
  projectIds: number[]
): Promise<Map<number, string>> {
  if (!projectIds.length) return new Map();
  const [joinNames, projects] = await Promise.all([
    loadAreaNamesByProjectIds(projectIds),
    prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, location: { select: { name: true } } },
    }),
  ]);
  const map = new Map<number, string>();
  for (const p of projects) {
    const name = joinNames.get(p.id) ?? p.location?.name;
    if (name) map.set(p.id, name);
  }
  return map;
}

export async function createUserActivity(
  body: ActivityPayload,
  session: SessionUser
) {
  if (!isDatabaseEnabled()) {
    return { success: false as const, message: "Database not configured" };
  }

  const entry = normalizeEntry(body);
  if (
    entry.projectId == null &&
    !entry.area &&
    entry.minPrice == null &&
    entry.maxPrice == null
  ) {
    return { success: false as const, message: "Nothing to record" };
  }

  if (entry.projectId != null && !entry.area) {
    const areaByProjectId = await resolveProjectAreaNames([entry.projectId]);
    entry.area = areaByProjectId.get(entry.projectId) ?? null;
  }

  const now = new Date();

  try {
    await executeRaw(
      `INSERT INTO user_search_history
        (user_id, project_id, area, minPrice, maxPrice, search_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      session.id,
      entry.projectId,
      entry.area,
      entry.minPrice,
      entry.maxPrice,
      "activity",
      entry.createdAt,
      now
    );
    return { success: true as const };
  } catch (e) {
    console.error("createUserActivity:", e);
    return { success: false as const, message: "Could not save activity" };
  }
}

/** Max guest rows accepted per sync request (most recent kept). */
export const SEARCH_HISTORY_SYNC_MAX = 100;

/**
 * One atomic INSERT — single DB round-trip, no loops, no Promise.all.
 */
export async function syncGuestHistory(
  userId: number,
  history: ActivityPayload[]
) {
  if (!isDatabaseEnabled()) {
    return { success: false as const, message: "Database not configured", added: 0 };
  }

  const items = history
    .map(normalizeEntry)
    .filter(
      (e) =>
        e.projectId != null ||
        e.area != null ||
        e.minPrice != null ||
        e.maxPrice != null
    )
    .slice(-SEARCH_HISTORY_SYNC_MAX);

  if (!items.length) {
    return { success: true as const, added: 0 };
  }

  const missingAreaProjectIds = [
    ...new Set(
      items
        .filter((e) => e.projectId != null && !e.area)
        .map((e) => e.projectId as number)
    ),
  ];
  const areaByProjectId = await resolveProjectAreaNames(missingAreaProjectIds);
  for (const e of items) {
    if (e.projectId != null && !e.area) {
      e.area = areaByProjectId.get(e.projectId) ?? null;
    }
  }

  const now = new Date();
  const placeholders: string[] = [];
  const params: unknown[] = [];

  for (const e of items) {
    placeholders.push("(?, ?, ?, ?, ?, ?, ?, ?)");
    params.push(
      userId,
      e.projectId,
      e.area,
      e.minPrice,
      e.maxPrice,
      "activity",
      e.createdAt,
      now
    );
  }

  try {
    await executeRaw(
      `INSERT INTO user_search_history
        (user_id, project_id, area, minPrice, maxPrice, search_type, created_at, updated_at)
       VALUES ${placeholders.join(", ")}`,
      ...params
    );
    return { success: true as const, added: items.length };
  } catch (e) {
    console.error("syncGuestHistory:", e);
    return { success: false as const, message: "Could not sync history", added: 0 };
  }
}

export type UserActivitySummaryRow = {
  rowNum: number;
  userId: number;
  userName: string;
  phone: string | null;
  email: string | null;
  lastActivityAt: string | null;
  lastInteraction: string;
};

function parseJson(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw);
    return typeof o === "object" && o && !Array.isArray(o) ? (o as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function describeInteraction(row: {
  project_id: number | null;
  project_name: string | null;
  project_slug: string | null;
  area: string | null;
  minPrice: unknown;
  maxPrice: unknown;
  json: string | null;
  search_type: string | null;
}): string {
  if (row.project_id != null) {
    return row.project_name ? `Opened ${row.project_name}` : `Viewed project #${row.project_id}`;
  }

  const area =
    row.area?.trim() ||
    (() => {
      const j = parseJson(row.json);
      const a = j.area;
      if (typeof a === "string" && a.trim()) return a.trim();
      if (Array.isArray(a) && a.length) return `Area filter (${a.length})`;
      return null;
    })();

  if (area) {
    return `Searched ${area}`;
  }

  const minP = num(row.minPrice);
  const maxP = num(row.maxPrice);
  if (minP != null || maxP != null) {
    if (minP != null && maxP != null) {
      return `Filtered price ${minP.toLocaleString()} – ${maxP.toLocaleString()}`;
    }
    if (minP != null) return `Filtered min price ${minP.toLocaleString()}`;
    return `Filtered max price ${maxP?.toLocaleString()}`;
  }

  if (row.search_type === "calculator" || row.search_type === "housing_calc") {
    return "Used housing calculator";
  }

  return "Browsed listings";
}

export async function listUsersWithActivity(filters: {
  page?: number;
  perPage?: number;
  search?: string;
  from?: string;
  to?: string;
}) {
  if (!isDatabaseEnabled()) {
    return { items: [] as UserActivitySummaryRow[], total: 0, error: "Database disabled" };
  }

  const page = filters.page ?? 1;
  const perPage = Math.min(filters.perPage ?? 25, 100);
  const skip = (page - 1) * perPage;

  const conditions = ["h.user_id IS NOT NULL"];
  const params: unknown[] = [];

  if (filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      "(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.phone_number LIKE ?)"
    );
    params.push(term, term, term, term);
  }

  if (filters.from && filters.to) {
    conditions.push("h.created_at BETWEEN ? AND ?");
    params.push(`${filters.from} 00:00:00`, `${filters.to} 23:59:59`);
  }

  const whereSql = conditions.join(" AND ");

  try {
    const countRows = await queryRaw<{ cnt: bigint }[]>(
      `SELECT COUNT(DISTINCT h.user_id) AS cnt
       FROM user_search_history h
       INNER JOIN users u ON u.id = h.user_id
       WHERE ${whereSql}`,
      ...params
    );
    const total = Number(countRows[0]?.cnt ?? 0);

    const rows = await queryRaw<
      {
        user_id: number;
        first_name: string | null;
        last_name: string | null;
        phone_number: string | null;
        email: string | null;
        last_activity_at: Date | null;
        project_id: number | null;
        project_name: string | null;
        project_slug: string | null;
        area: string | null;
        minPrice: unknown;
        maxPrice: unknown;
        json: string | null;
        search_type: string | null;
      }[]
    >(
      `SELECT
         u.id AS user_id,
         u.first_name,
         u.last_name,
         u.phone_number,
         u.email,
         latest.last_activity_at,
         h.project_id,
         p.name AS project_name,
         p.slug AS project_slug,
         h.area,
         h.minPrice,
         h.maxPrice,
         h.json,
         h.search_type
       FROM (
         SELECT user_id, MAX(created_at) AS last_activity_at
         FROM user_search_history
         WHERE user_id IS NOT NULL
         GROUP BY user_id
       ) latest
       INNER JOIN users u ON u.id = latest.user_id
       INNER JOIN user_search_history h
         ON h.user_id = latest.user_id AND h.created_at = latest.last_activity_at
       LEFT JOIN projects p ON p.id = h.project_id
       WHERE ${whereSql}
       ORDER BY latest.last_activity_at DESC
       LIMIT ? OFFSET ?`,
      ...params,
      perPage,
      skip
    );

    const items: UserActivitySummaryRow[] = rows.map((r, i) => {
      const userName =
        r.first_name != null
          ? `${r.first_name}${r.last_name ? ` ${r.last_name}` : ""}`.trim()
          : "User";

      return {
        rowNum: skip + i + 1,
        userId: jsonNum(r.user_id),
        userName,
        phone: r.phone_number,
        email: r.email,
        lastActivityAt: r.last_activity_at
          ? new Date(r.last_activity_at).toISOString()
          : null,
        lastInteraction: describeInteraction(r),
      };
    });

    return { items, total };
  } catch (e) {
    return { items: [] as UserActivitySummaryRow[], total: 0, error: String(e) };
  }
}

export type UserAnalytics = {
  user: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
  };
  topAreas: { area: string; count: number; percent: number }[];
  budget: { avgMin: number | null; avgMax: number | null };
  timeline: {
    projectId: number | null;
    projectSlug: string | null;
    projectName: string | null;
    lastActivityAt: string;
    events: { createdAt: string; label: string }[];
  }[];
};

export async function getUserSearchAnalytics(userId: number) {
  if (!isDatabaseEnabled()) {
    return { analytics: null, error: "Database disabled" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
    },
  });

  if (!user) {
    return { analytics: null, error: "User not found" };
  }

  const userName = `${user.firstName ?? ""}${user.lastName ? ` ${user.lastName}` : ""}`.trim();

  const areaRows = await queryRaw<{ area: string; cnt: bigint }[]>(
    `SELECT area, COUNT(*) AS cnt
     FROM user_search_history
     WHERE user_id = ? AND area IS NOT NULL AND TRIM(area) != ''
     GROUP BY area
     ORDER BY cnt DESC
     LIMIT 3`,
    userId
  );

  const areaTotal = areaRows.reduce((s, r) => s + Number(r.cnt), 0);

  const budgetRows = await queryRaw<{ avg_min: unknown; avg_max: unknown }[]>(
    `SELECT AVG(minPrice) AS avg_min, AVG(maxPrice) AS avg_max
     FROM user_search_history
     WHERE user_id = ? AND (minPrice > 0 OR maxPrice > 0)`,
    userId
  );

  const timelineRows = await queryRaw<
    {
      created_at: Date | null;
      area: string | null;
      project_id: number | null;
      project_name: string | null;
      project_slug: string | null;
      minPrice: unknown;
      maxPrice: unknown;
      json: string | null;
      search_type: string | null;
    }[]
  >(
    `SELECT h.created_at, h.area, h.project_id, p.name AS project_name, p.slug AS project_slug,
            h.minPrice, h.maxPrice, h.json, h.search_type
     FROM user_search_history h
     LEFT JOIN projects p ON p.id = h.project_id
     WHERE h.user_id = ?
     ORDER BY h.created_at DESC
     LIMIT 50`,
    userId
  );

  // Richer signals (section views, time-on-page, voucher generation) land in activity_log,
  // not user_search_history — merge both sources so the feed shows everything a visitor did,
  // not just which projects they opened.
  const activityRows = await queryRaw<
    {
      created_at: Date | null;
      description: string;
      log_table: string | null;
      subject_id: unknown;
      project_name: string | null;
      project_slug: string | null;
    }[]
  >(
    `SELECT a.created_at, a.description, a.log_table, a.subject_id,
            p.name AS project_name, p.slug AS project_slug
     FROM activity_log a
     LEFT JOIN projects p ON p.id = a.subject_id AND a.log_table = 'projects'
     WHERE a.causer_id = ?
     ORDER BY a.created_at DESC
     LIMIT 50`,
    userId
  );

  type FlatEntry = {
    createdAt: string;
    label: string;
    projectId: number | null;
    projectSlug: string | null;
    projectName: string | null;
  };

  const searchTimeline: FlatEntry[] = timelineRows.map((r) => ({
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : "",
    label: describeInteraction(r),
    projectId: r.project_id != null ? jsonNum(r.project_id) : null,
    projectSlug: r.project_slug,
    projectName: r.project_name,
  }));

  const activityTimeline: FlatEntry[] = activityRows.map((r) => ({
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : "",
    label: r.description,
    projectId: r.log_table === "projects" ? jsonNumOrNull(r.subject_id) : null,
    projectSlug: r.log_table === "projects" ? r.project_slug : null,
    projectName: r.log_table === "projects" ? r.project_name : null,
  }));

  // Group by project so an admin can follow one visitor's journey through one project at a
  // time, instead of a single feed interleaving unrelated projects chronologically.
  const groups = new Map<
    string,
    {
      projectId: number | null;
      projectSlug: string | null;
      projectName: string | null;
      events: { createdAt: string; label: string }[];
    }
  >();

  const flat = [...searchTimeline, ...activityTimeline].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
  );

  for (const entry of flat) {
    const key = entry.projectId != null ? String(entry.projectId) : "general";
    let group = groups.get(key);
    if (!group) {
      group = {
        projectId: entry.projectId,
        projectSlug: entry.projectSlug,
        projectName: entry.projectId != null ? entry.projectName : "Other activity",
        events: [],
      };
      groups.set(key, group);
    }
    group.events.push({ createdAt: entry.createdAt, label: entry.label });
  }

  const timeline = Array.from(groups.values())
    .map((g) => ({ ...g, lastActivityAt: g.events[0]?.createdAt ?? "" }))
    .sort((a, b) =>
      a.lastActivityAt < b.lastActivityAt ? 1 : a.lastActivityAt > b.lastActivityAt ? -1 : 0
    );

  const analytics: UserAnalytics = {
    user: {
      id: user.id,
      name: userName || "User",
      email: user.email,
      phone: user.phoneNumber,
    },
    topAreas: areaRows.map((r) => ({
      area: r.area,
      count: Number(r.cnt),
      percent: areaTotal > 0 ? Math.round((Number(r.cnt) / areaTotal) * 100) : 0,
    })),
    budget: {
      avgMin: num(budgetRows[0]?.avg_min),
      avgMax: num(budgetRows[0]?.avg_max),
    },
    timeline,
  };

  return { analytics };
}

export async function deleteUserSearchHistory(userId: number) {
  if (!isDatabaseEnabled()) {
    return { success: false as const, error: "Database disabled", deleted: 0 };
  }

  if (!Number.isFinite(userId) || userId <= 0) {
    return { success: false as const, error: "Invalid user id", deleted: 0 };
  }

  try {
    const result = await prisma.userSearchHistory.deleteMany({ where: { userId } });
    return { success: true as const, deleted: result.count };
  } catch {
    return { success: false as const, error: "Could not delete history", deleted: 0 };
  }
}
