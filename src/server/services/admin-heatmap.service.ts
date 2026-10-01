import { queryRaw } from "@/lib/prisma-raw";
import { isDatabaseEnabled } from "@/lib/db";
import { jsonNum } from "@/lib/prisma-json";
import { userTypeIds } from "@/config/site";

export type HeatmapDay = { date: string; count: number };

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

async function dailyCounts(table: string, extraWhere: string, params: unknown[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    const rows = await queryRaw<{ d: Date; cnt: bigint }[]>(
      `SELECT DATE(created_at) AS d, COUNT(*) AS cnt FROM ${table}
       WHERE created_at >= ? ${extraWhere}
       GROUP BY DATE(created_at)`,
      ...params
    );
    for (const r of rows) {
      map.set(localDateKey(startOfDay(new Date(r.d))), jsonNum(r.cnt));
    }
  } catch {
    /* table drift or missing column — skip this source rather than fail the whole heatmap */
  }
  return map;
}

const DAYS = 365;

/** Combined daily activity (signups + inquiries + reviews + new projects) across the past
 * year — a single "is the platform alive" signal, GitHub-heatmap style. */
export async function getYearlyActivityHeatmap(): Promise<HeatmapDay[]> {
  if (!isDatabaseEnabled()) return [];

  const from = startOfDay(new Date());
  from.setDate(from.getDate() - (DAYS - 1));

  const [signups, inquiries, reviews, projects] = await Promise.all([
    dailyCounts("users", "AND user_type_id = ? AND is_archive = 0", [from, userTypeIds.websiteUser]),
    dailyCounts("inquiries", "", [from]),
    dailyCounts("reviews", "", [from]),
    dailyCounts("projects", "AND is_archive = 0", [from]),
  ]);

  const days: HeatmapDay[] = [];
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const key = localDateKey(d);
    const count =
      (signups.get(key) ?? 0) + (inquiries.get(key) ?? 0) + (reviews.get(key) ?? 0) + (projects.get(key) ?? 0);
    days.push({ date: key, count });
  }

  return days;
}
