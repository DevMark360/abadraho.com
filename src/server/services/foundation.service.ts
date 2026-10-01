import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { siteConfig } from "@/config/site";

export type FoundationCheck = {
  phase: 0;
  timestamp: string;
  useDatabase: boolean;
  databaseUrlSet: boolean;
  db: {
    connected: boolean;
    counts: Record<string, number>;
    errors: { model: string; error: string }[];
    optional?: Record<string, number | null>;
  };
  api: { name: string; ok: boolean; status: number; preview: string }[];
  passed: boolean;
};

async function countBrokers(): Promise<number> {
  try {
    return await prisma.broker.count({ where: { isArchive: false } });
  } catch (e) {
    const msg = String(e instanceof Error ? e.message : e);
    if (msg.includes("does not exist")) {
      return prisma.user.count({ where: { userTypeId: -10027, isArchive: false } });
    }
    throw e;
  }
}

const MODEL_PROBES: { key: string; fn: () => Promise<number> }[] = [
  { key: "projects", fn: () => prisma.project.count({ where: { isArchive: false } }) },
  { key: "users", fn: () => prisma.user.count() },
  { key: "units", fn: () => prisma.unit.count({ where: { isArchive: false } }) },
  { key: "areas", fn: () => prisma.area.count() },
  { key: "builders", fn: () => prisma.builder.count() },
  { key: "vouchers", fn: () => prisma.voucher.count() },
  { key: "tags", fn: () => prisma.tag.count({ where: { isArchive: false } }) },
  { key: "amenities", fn: () => prisma.amenity.count({ where: { isArchive: false } }) },
  { key: "utilities", fn: () => prisma.utility.count({ where: { isArchive: false } }) },
  { key: "roomTypes", fn: () => prisma.roomType.count({ where: { isArchive: false } }) },
  { key: "roomTypeUnits", fn: () => prisma.roomTypeUnit.count({ where: { isArchive: false } }) },
  { key: "teams", fn: () => prisma.team.count() },
  { key: "paymentSchedules", fn: () => prisma.paymentSchedule.count() },
  { key: "activityLogs", fn: () => prisma.activityLog.count() },
  { key: "inquiries", fn: () => prisma.inquiry.count() },
  { key: "blogs", fn: () => prisma.blog.count({ where: { isArchive: false } }) },
  { key: "customers", fn: () => prisma.user.count({ where: { userTypeId: -10024, isArchive: false } }) },
  { key: "userVouchers", fn: () => prisma.userVoucher.count() },
];

const API_PROBES = [
  { name: "v2 health", path: "/api/v1/health" },
  { name: "v2 meta filters", path: "/api/v1/meta/filters" },
  { name: "v2 projects", path: "/api/v1/projects?perPage=1" },
  { name: "v2 map data", path: "/api/v1/projects/map-data" },
];

async function probeApi(
  name: string,
  path: string,
  options?: { healthAuthToken?: string }
) {
  const base = siteConfig.url.replace(/\/$/, "");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (path === "/api/v1/health" && options?.healthAuthToken) {
    headers.Authorization = `Bearer ${options.healthAuthToken}`;
  }
  try {
    const res = await fetch(`${base}${path}`, {
      signal: AbortSignal.timeout(15_000),
      headers,
    });
    const text = await res.text();
    return {
      name,
      ok: res.ok,
      status: res.status,
      preview: text.slice(0, 120).replace(/\s+/g, " "),
    };
  } catch (e) {
    return {
      name,
      ok: false,
      status: 0,
      preview: String(e instanceof Error ? e.message : e),
    };
  }
}

/** Phase 0 foundation verification — DB table probes + v2 API smoke tests */
export async function runFoundationCheck(options?: {
  healthAuthToken?: string;
}): Promise<FoundationCheck> {
  const report: FoundationCheck = {
    phase: 0,
    timestamp: new Date().toISOString(),
    useDatabase: isDatabaseEnabled(),
    databaseUrlSet: Boolean(process.env.DATABASE_URL?.includes("mysql")),
    db: { connected: false, counts: {}, errors: [], optional: {} },
    api: [],
    passed: false,
  };

  if (report.useDatabase && report.databaseUrlSet) {
    try {
      await prisma.$connect();
      report.db.connected = true;
      for (const { key, fn } of MODEL_PROBES) {
        try {
          report.db.counts[key] = await fn();
        } catch (e) {
          report.db.errors.push({
            model: key,
            error: String(e instanceof Error ? e.message : e),
          });
        }
      }
      try {
        report.db.optional!.brokers = await countBrokers();
      } catch {
        report.db.optional!.brokers = null;
      }
    } catch (e) {
      report.db.errors.push({
        model: "_connect",
        error: String(e instanceof Error ? e.message : e),
      });
    } finally {
      await prisma.$disconnect();
    }
  }

  report.api = await Promise.all(
    API_PROBES.map((p) => probeApi(p.name, p.path, options))
  );

  const dbOk =
    !report.useDatabase ||
    (report.db.connected &&
      report.db.errors.length === 0 &&
      (report.db.counts.projects ?? 0) > 0);
  const apiOk = report.api.every((p) => p.ok);
  report.passed = dbOk && apiOk;

  return report;
}

