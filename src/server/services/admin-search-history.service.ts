import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import {
  jsonContainsFragment,
  joinSqlAnd,
  joinSqlOr,
  safeFilterString,
  safeFilterStrings,
  safePositiveInts,
  type SqlFragment,
} from "@/lib/mysql-json-contains";
import { jsonNum, jsonNumOrNull } from "@/lib/prisma-json";

export type SearchHistoryMode = "main" | "housing" | "advance";

export type SearchHistoryListFilters = {
  page?: number;
  perPage?: number;
  mode: SearchHistoryMode;
  /** Main list: user applied filter form (legacy forces search_type = filter) */
  mainFiltered?: boolean;
  area?: number[];
  progress?: string[];
  type?: number[];
  builder?: number[];
  minDownPayment?: number;
  maxDownPayment?: number;
  minMonthlyInstall?: number;
  maxMonthlyInstall?: number;
  minPrice?: number;
  maxPrice?: number;
  from?: string;
  to?: string;
  /** Housing calculator */
  maxBudget?: number;
  projectType?: string;
  duration?: string[];
  downPayment?: number;
  slabCasting?: number;
  plinth?: number;
  colour?: number;
  monthInstall?: number;
  quarterlyInstall?: number;
  halfYearlyInstall?: number;
  yearlyInstall?: number;
  possession?: number;
  /** Advance search */
  search?: string;
};

export type FilterOptions = {
  areas: { id: number; name: string }[];
  progress: { name: string }[];
  types: { id: number; title: string }[];
  builders: { id: number; fullName: string }[];
};

export type SearchHistoryRow = {
  rowNum: number;
  id: number;
  createdAt: string | null;
  searchType: string | null;
  userId: number | null;
  userName: string;
  phone: string | null;
  email: string | null;
  areaNames: string[];
  progressNames: string[];
  typeNames: string[];
  builderNames: string[];
  minDP: number | null;
  maxDP: number | null;
  minMI: number | null;
  maxMI: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  maxBudget: number | null;
  downPayment: number | null;
  projectType: string | null;
  duration: string[];
  slabCasting: number | null;
  plinth: number | null;
  colour: number | null;
  monthInstall: number | null;
  quarterlyInstall: number | null;
  halfYearlyInstall: number | null;
  yearlyInstall: number | null;
  possession: number | null;
};

function dec(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseJson(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw);
    return typeof o === "object" && o && !Array.isArray(o) ? (o as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function arrNum(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => jsonNum(x)).filter((n) => n > 0);
}

function arrStr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(String).filter(Boolean);
}

export async function loadSearchHistoryFilterOptions(): Promise<FilterOptions> {
  const [areas, progress, types, builders] = await Promise.all([
    prisma.area.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.progress.findMany({
      where: { isActive: true },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.projectType.findMany({
      where: { isArchive: false },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.builder.findMany({
      where: { isArchive: false },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return {
    areas: areas.map((a) => ({ id: jsonNum(a.id), name: a.name })),
    progress: progress.map((p) => ({ name: p.name })),
    types: types.map((t) => ({ id: t.id, title: t.title })),
    builders: builders.map((b) => ({ id: b.id, fullName: b.fullName })),
  };
}

async function loadLookups(rows: { json: string | null }[]) {
  const areaIds = new Set<number>();
  const progressNames = new Set<string>();
  const typeIds = new Set<number>();
  const builderIds = new Set<number>();

  for (const row of rows) {
    const j = parseJson(row.json);
    arrNum(j.area).forEach((id) => areaIds.add(id));
    arrStr(j.progress).forEach((n) => progressNames.add(n));
    arrNum(j.type).forEach((id) => typeIds.add(id));
    arrNum(j.builder).forEach((id) => builderIds.add(id));
  }

  const [areas, progresses, types, builders] = await Promise.all([
    areaIds.size
      ? prisma.area.findMany({
          where: { id: { in: [...areaIds].map((id) => BigInt(id)) } },
          select: { id: true, name: true },
        })
      : [],
    progressNames.size
      ? prisma.progress.findMany({
          where: { name: { in: [...progressNames] } },
          select: { name: true },
        })
      : [],
    typeIds.size
      ? prisma.projectType.findMany({
          where: { id: { in: [...typeIds] } },
          select: { id: true, title: true },
        })
      : [],
    builderIds.size
      ? prisma.builder.findMany({
          where: { id: { in: [...builderIds] } },
          select: { id: true, fullName: true },
        })
      : [],
  ]);

  const areaMap = new Map(areas.map((a) => [jsonNum(a.id), a.name]));
  const progressMap = new Map(progresses.map((p) => [p.name, p.name]));
  const typeMap = new Map(types.map((t) => [t.id, t.title]));
  const builderMap = new Map(builders.map((b) => [b.id, b.fullName]));

  return { areaMap, progressMap, typeMap, builderMap };
}

function enrichRow(
  row: {
    id: number;
    user_id: number | null;
    search_type: string | null;
    json: string | null;
    created_at: Date | null;
    first_name: string | null;
    last_name: string | null;
    phone_number: string | null;
    email: string | null;
    minDP: unknown;
    maxDP: unknown;
    minMI: unknown;
    maxMI: unknown;
    minPrice: unknown;
    maxPrice: unknown;
    maxBudget: unknown;
    downPayment: unknown;
    slabCasting: unknown;
    plinth: unknown;
    colour: unknown;
    monthInstall: unknown;
    quarterlyInstall: unknown;
    halfYearlyInstall: unknown;
    yearlyInstall: unknown;
    possession: unknown;
  },
  rowNum: number,
  lookups: Awaited<ReturnType<typeof loadLookups>>
): SearchHistoryRow {
  const j = parseJson(row.json);
  const { areaMap, progressMap, typeMap, builderMap } = lookups;

  const areaNames = arrNum(j.area)
    .map((id) => areaMap.get(id))
    .filter((x): x is string => Boolean(x));
  const progressNames = arrStr(j.progress)
    .map((n) => progressMap.get(n))
    .filter((x): x is string => Boolean(x));
  const typeNames = arrNum(j.type)
    .map((id) => typeMap.get(id))
    .filter((x): x is string => Boolean(x));
  const builderNames = arrNum(j.builder)
    .map((id) => builderMap.get(id))
    .filter((x): x is string => Boolean(x));

  const userName =
    row.first_name != null
      ? `${row.first_name}${row.last_name ? ` ${row.last_name}` : ""}`.trim()
      : "Visitor";

  return {
    rowNum,
    id: jsonNum(row.id),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    searchType: row.search_type,
    userId: jsonNumOrNull(row.user_id),
    userName,
    phone: row.phone_number,
    email: row.email,
    areaNames,
    progressNames,
    typeNames,
    builderNames,
    minDP: dec(row.minDP) ?? dec(j.minDP),
    maxDP: dec(row.maxDP) ?? dec(j.maxDP),
    minMI: dec(row.minMI) ?? dec(j.minMI),
    maxMI: dec(row.maxMI) ?? dec(j.maxMI),
    minPrice: dec(row.minPrice) ?? dec(j.minPrice),
    maxPrice: dec(row.maxPrice) ?? dec(j.maxPrice),
    maxBudget: dec(row.maxBudget) ?? dec(j.maxBudget),
    downPayment: dec(row.downPayment) ?? dec(j.downPayment),
    projectType: typeof j.projectType === "string" ? j.projectType : null,
    duration: arrStr(j.duration),
    slabCasting: dec(row.slabCasting) ?? dec(j.slabCasting),
    plinth: dec(row.plinth) ?? dec(j.plinth),
    colour: dec(row.colour) ?? dec(j.colour),
    monthInstall: dec(row.monthInstall) ?? dec(j.monthInstall),
    quarterlyInstall: dec(row.quarterlyInstall) ?? dec(j.quarterlyInstall),
    halfYearlyInstall: dec(row.halfYearlyInstall) ?? dec(j.halfYearlyInstall),
    yearlyInstall: dec(row.yearlyInstall) ?? dec(j.yearlyInstall),
    possession: dec(row.possession) ?? dec(j.possession),
  };
}

function buildWhere(filters: SearchHistoryListFilters): { sql: string; params: unknown[] } {
  const conditions: string[] = ["1=1"];
  const params: unknown[] = [];

  if (filters.mode === "housing") {
    conditions.push("h.search_type = ?");
    params.push("calculator");
  } else if (filters.mode === "main") {
    if (filters.mainFiltered) {
      conditions.push("h.search_type = ?");
      params.push("filter");
    } else {
      conditions.push(
        "(h.search_type IN ('filter','calculator','off_plan') OR h.search_type IS NULL)"
      );
    }
  }

  const jsonAndGroups: SqlFragment[] = [];

  const areaIds = safePositiveInts(filters.area);
  if (areaIds.length) {
    jsonAndGroups.push(
      joinSqlOr(areaIds.map((a) => jsonContainsFragment("h.json", "area", a)))
    );
  }

  const progressNames = safeFilterStrings(filters.progress);
  if (progressNames.length) {
    jsonAndGroups.push(
      joinSqlOr(progressNames.map((p) => jsonContainsFragment("h.json", "progress", p)))
    );
  }

  const typeIds = safePositiveInts(filters.type);
  if (typeIds.length) {
    jsonAndGroups.push(
      joinSqlOr(typeIds.map((t) => jsonContainsFragment("h.json", "type", t)))
    );
  }

  const builderIds = safePositiveInts(filters.builder);
  if (builderIds.length) {
    jsonAndGroups.push(
      joinSqlOr(builderIds.map((b) => jsonContainsFragment("h.json", "builder", b)))
    );
  }

  if (jsonAndGroups.length) {
    const combined = joinSqlAnd(jsonAndGroups);
    conditions.push(combined.sql);
    params.push(...combined.params);
  }

  if (filters.minDownPayment != null) {
    conditions.push("h.minDP >= ?");
    params.push(filters.minDownPayment);
  }
  if (filters.maxDownPayment != null) {
    conditions.push("h.maxDP <= ?");
    params.push(filters.maxDownPayment);
  }
  if (filters.minMonthlyInstall != null) {
    conditions.push("h.minMI >= ?");
    params.push(filters.minMonthlyInstall);
  }
  if (filters.maxMonthlyInstall != null) {
    conditions.push("h.maxMI <= ?");
    params.push(filters.maxMonthlyInstall);
  }
  if (filters.minPrice != null) {
    conditions.push("h.minPrice >= ?");
    params.push(filters.minPrice);
  }
  if (filters.maxPrice != null) {
    conditions.push("h.maxPrice <= ?");
    params.push(filters.maxPrice);
  }

  if (filters.from && filters.to) {
    conditions.push("h.created_at BETWEEN ? AND ?");
    params.push(`${filters.from} 00:00:00`, `${filters.to} 23:59:59`);
  }

  if (filters.mode === "housing") {
    if (filters.maxBudget != null) {
      conditions.push("h.maxBudget <= ?");
      params.push(filters.maxBudget);
    }
    if (filters.downPayment != null) {
      conditions.push("h.downPayment <= ?");
      params.push(filters.downPayment);
    }
    if (filters.monthInstall != null) {
      conditions.push("h.monthInstall <= ?");
      params.push(filters.monthInstall);
    }
    if (filters.yearlyInstall != null) {
      conditions.push("h.yearlyInstall <= ?");
      params.push(filters.yearlyInstall);
    }
    if (filters.halfYearlyInstall != null) {
      conditions.push("h.halfYearlyInstall <= ?");
      params.push(filters.halfYearlyInstall);
    }
    if (filters.quarterlyInstall != null) {
      conditions.push("h.quarterlyInstall <= ?");
      params.push(filters.quarterlyInstall);
    }
    if (filters.possession != null) {
      conditions.push("h.possession <= ?");
      params.push(filters.possession);
    }
    if (filters.slabCasting != null) {
      conditions.push("h.slabCasting <= ?");
      params.push(filters.slabCasting);
    }
    if (filters.plinth != null) {
      conditions.push("h.plinth <= ?");
      params.push(filters.plinth);
    }
    if (filters.colour != null) {
      conditions.push("h.colour <= ?");
      params.push(filters.colour);
    }
    const projectType = safeFilterString(filters.projectType);
    if (projectType) {
      const frag = jsonContainsFragment("h.json", "projectType", projectType);
      conditions.push(frag.sql);
      params.push(...frag.params);
    }
    const durationValues = safeFilterStrings(filters.duration);
    if (durationValues.length) {
      const frag = joinSqlOr(
        durationValues.map((d) => jsonContainsFragment("h.json", "duration", d))
      );
      conditions.push(frag.sql);
      params.push(...frag.params);
    }
  }

  if (filters.mode === "advance" && filters.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    conditions.push(
      `(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR h.json LIKE ?)`
    );
    params.push(term, term, term, term);
  }

  return { sql: conditions.join(" AND "), params };
}

const SELECT_COLS = `
  h.id, h.user_id, h.search_type, h.json, h.created_at,
  h.minDP, h.maxDP, h.minMI, h.maxMI, h.minPrice, h.maxPrice,
  h.maxBudget, h.downPayment, h.slabCasting, h.plinth, h.colour,
  h.monthInstall, h.quarterlyInstall, h.halfYearlyInstall, h.yearlyInstall, h.possession,
  u.first_name, u.last_name, u.phone_number, u.email
`;

export async function listSearchHistory(filters: SearchHistoryListFilters) {
  if (!isDatabaseEnabled()) {
    return { items: [] as SearchHistoryRow[], total: 0, error: "Database disabled" };
  }

  const page = filters.page ?? 1;
  const perPage = Math.min(filters.perPage ?? 25, 100);
  const skip = (page - 1) * perPage;
  const { sql: whereSql, params } = buildWhere(filters);

  try {
    const countRows = await queryRaw<{ cnt: bigint }[]>(
      `SELECT COUNT(*) AS cnt FROM user_search_history h
       LEFT JOIN users u ON u.id = h.user_id
       WHERE ${whereSql}`,
      ...params
    );
    const total = Number(countRows[0]?.cnt ?? 0);

    const rows = await queryRaw<
      {
        id: number;
        user_id: number | null;
        search_type: string | null;
        json: string | null;
        created_at: Date | null;
        first_name: string | null;
        last_name: string | null;
        phone_number: string | null;
        email: string | null;
        minDP: unknown;
        maxDP: unknown;
        minMI: unknown;
        maxMI: unknown;
        minPrice: unknown;
        maxPrice: unknown;
        maxBudget: unknown;
        downPayment: unknown;
        slabCasting: unknown;
        plinth: unknown;
        colour: unknown;
        monthInstall: unknown;
        quarterlyInstall: unknown;
        halfYearlyInstall: unknown;
        yearlyInstall: unknown;
        possession: unknown;
      }[]
    >(
      `SELECT ${SELECT_COLS}
       FROM user_search_history h
       LEFT JOIN users u ON u.id = h.user_id
       WHERE ${whereSql}
       ORDER BY h.created_at DESC
       LIMIT ? OFFSET ?`,
      ...params,
      perPage,
      skip
    );

    const lookups = await loadLookups(rows);
    const items = rows.map((r, i) => enrichRow(r, skip + i + 1, lookups));

    return { items, total };
  } catch (e) {
    return { items: [] as SearchHistoryRow[], total: 0, error: String(e) };
  }
}

export async function getSearchHistoryDetail(id: number) {
  if (!isDatabaseEnabled()) return { record: null, error: "Database disabled" };

  const rows = await queryRaw<
    {
      id: number;
      user_id: number | null;
      search_type: string | null;
      json: string | null;
      created_at: Date | null;
      first_name: string | null;
      last_name: string | null;
      phone_number: string | null;
      email: string | null;
      minDP: unknown;
      maxDP: unknown;
      minMI: unknown;
      maxMI: unknown;
      minPrice: unknown;
      maxPrice: unknown;
      maxBudget: unknown;
      downPayment: unknown;
      slabCasting: unknown;
      plinth: unknown;
      colour: unknown;
      monthInstall: unknown;
      quarterlyInstall: unknown;
      halfYearlyInstall: unknown;
      yearlyInstall: unknown;
      possession: unknown;
    }[]
  >(
    `SELECT ${SELECT_COLS}
     FROM user_search_history h
     LEFT JOIN users u ON u.id = h.user_id
     WHERE h.id = ?`,
    id
  );

  const row = rows[0];
  if (!row) return { record: null, error: "Not found" };

  const lookups = await loadLookups([row]);
  const enriched = enrichRow(row, 1, lookups);
  const params = parseJson(row.json);

  const progressResolved = arrStr(params.progress);
  const builderResolved = arrNum(params.builder)
    .map((bid) => lookups.builderMap.get(bid))
    .filter((x): x is string => Boolean(x));

  return {
    record: {
      ...enriched,
      rawParams: params,
      progressList: progressResolved,
      builderList: builderResolved,
    },
  };
}

export async function exportSearchHistoryRows(
  filters: SearchHistoryListFilters,
  fields: string[]
) {
  const all = await listSearchHistory({ ...filters, page: 1, perPage: 50_000 });
  if (all.error) return { rows: [], error: all.error };

  const fieldMap: Record<string, (r: SearchHistoryRow) => unknown> = {
    "Date/Time": (r) => r.createdAt ?? "",
    "User Name": (r) => r.userName,
    Phone: (r) => r.phone ?? "",
    Email: (r) => r.email ?? "",
    Area: (r) => r.areaNames.join(", "),
    Progress: (r) => r.progressNames.join(", "),
    Type: (r) => r.typeNames.join(", "),
    Builder: (r) => r.builderNames.join(", "),
    "Min Down Payment": (r) => r.minDP ?? "",
    "Max Down Payment": (r) => r.maxDP ?? "",
    "Min Monthly Installment": (r) => r.minMI ?? "",
    "Max Monthly Installment": (r) => r.maxMI ?? "",
    "Min Price": (r) => r.minPrice ?? "",
    "Max Price": (r) => r.maxPrice ?? "",
    Budget: (r) => r.maxBudget ?? "",
    "Project Type": (r) => r.projectType ?? "",
    Duration: (r) => r.duration.join(", "),
    "Down Payment": (r) => r.downPayment ?? "",
    "Monthly Installment": (r) => r.monthInstall ?? "",
    "Quarterly Installment": (r) => r.quarterlyInstall ?? "",
    "Half Yearly Installment": (r) => r.halfYearlyInstall ?? "",
    "Yearly Installment": (r) => r.yearlyInstall ?? "",
    Possession: (r) => r.possession ?? "",
    "Slab Casting": (r) => r.slabCasting ?? "",
    Plinth: (r) => r.plinth ?? "",
    Colour: (r) => r.colour ?? "",
  };

  const cols =
    fields.length > 0
      ? fields.filter((f) => fieldMap[f])
      : Object.keys(fieldMap);

  const rows = all.items.map((r) => {
    const out: Record<string, unknown> = {};
    for (const c of cols) out[c] = fieldMap[c]?.(r) ?? "";
    return out;
  });

  return { rows, headers: cols, error: undefined as string | undefined };
}

/** Permission module for deleting a search history row; null = no module-specific check. */
export function searchHistoryDeletePermissionModule(searchType: string | null): string | null {
  if (searchType === "calculator" || searchType === "housing_calc") {
    return "housing_calc_search";
  }
  return null;
}

export async function deleteSearchHistory(id: number) {
  if (!isDatabaseEnabled()) {
    return { success: false as const, error: "Database disabled" };
  }

  try {
    await prisma.userSearchHistory.delete({ where: { id } });
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Not found or could not delete" };
  }
}
