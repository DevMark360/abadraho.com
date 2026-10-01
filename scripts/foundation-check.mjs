/**
 * Phase 0 foundation verification — DB counts, table probes, legacy proxy audit.
 * Usage: node scripts/foundation-check.mjs
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const LEGACY_API = (process.env.LEGACY_API_URL ?? "https://dev.abadraho.com/api").replace(/\/$/, "");
const LEGACY_SITE = (process.env.NEXT_PUBLIC_LEGACY_SITE_URL ?? "https://dev.abadraho.com").replace(/\/$/, "");

/** Required for Phase 0 pass — must query without error */
const REQUIRED_COUNTS = [
  ["projects", () => prisma.project.count({ where: { isArchive: false } })],
  ["users", () => prisma.user.count()],
  ["units", () => prisma.unit.count({ where: { isArchive: false } })],
  ["areas", () => prisma.area.count()],
  ["builders", () => prisma.builder.count()],
  ["vouchers", () => prisma.voucher.count()],
  ["tags", () => prisma.tag.count({ where: { isArchive: false } })],
  ["amenities", () => prisma.amenity.count({ where: { isArchive: false } })],
  ["utilities", () => prisma.utility.count({ where: { isArchive: false } })],
  ["roomTypes", () => prisma.roomType.count({ where: { isArchive: false } })],
  ["roomTypeUnits", () => prisma.roomTypeUnit.count({ where: { isArchive: false } })],
  ["teams", () => prisma.team.count()],
  ["paymentSchedules", () => prisma.paymentSchedule.count()],
  ["activityLogs", () => prisma.activityLog.count()],
  ["inquiries", () => prisma.inquiry.count()],
  ["blogs", () => prisma.blog.count({ where: { isArchive: false } })],
  ["customers", () => prisma.user.count({ where: { userTypeId: -10024, isArchive: false } })],
  ["userVouchers", () => prisma.userVoucher.count()],
];

async function countBrokers() {
  try {
    return await prisma.broker.count({ where: { isArchive: false } });
  } catch (e) {
    const msg = String(e.message ?? e);
    if (msg.includes("does not exist")) {
      return prisma.user.count({ where: { userTypeId: -10027, isArchive: false } });
    }
    throw e;
  }
}

/** Legacy API endpoints v2 may proxy during migration */
const PROXY_TESTS = [
  { name: "GET projects/all", url: `${LEGACY_API}/projects/all`, method: "GET" },
  { name: "GET projects/all-areas", url: `${LEGACY_API}/projects/all-areas`, method: "GET" },
  { name: "GET projects/all-types", url: `${LEGACY_API}/projects/all-types`, method: "GET" },
  { name: "GET projects/all-units", url: `${LEGACY_API}/projects/all-units`, method: "GET" },
  { name: "GET all (search)", url: `${LEGACY_API}/all`, method: "GET" },
  { name: "POST projects/filter", url: `${LEGACY_API}/projects/filter`, method: "POST", body: "{}" },
  { name: "POST filter (search)", url: `${LEGACY_API}/filter`, method: "POST", body: "{}" },
  { name: "POST projects/show", url: `${LEGACY_API}/projects/show`, method: "POST", body: '{"slug":"saima-arabian-ranches"}' },
  { name: "POST login", url: `${LEGACY_API}/login`, method: "POST", body: "{}" },
  { name: "POST register", url: `${LEGACY_API}/register`, method: "POST", body: "{}" },
  { name: "POST search history", url: `${LEGACY_API}/search`, method: "POST", body: "{}" },
  { name: "GET site off-plan map-data", url: `${LEGACY_SITE}/off-plan/map-data`, method: "GET" },
];

async function probeLegacy(test) {
  const accept = test.acceptStatuses ?? [200, 201];
  try {
    const res = await fetch(test.url, {
      method: test.method ?? "GET",
      signal: AbortSignal.timeout(15_000),
      headers: {
        Accept: "application/json",
        ...(test.body ? { "Content-Type": "application/json" } : {}),
      },
      body: test.body,
    });
    let preview = "";
    try {
      const text = await res.text();
      preview = text.slice(0, 80).replace(/\s+/g, " ");
    } catch {
      preview = "(no body)";
    }
    const degraded =
      /server error|given data was invalid|unauthenticated|not found/i.test(preview);
    const ok = accept.includes(res.status) && !degraded;
    return {
      name: test.name,
      ok,
      status: res.status,
      preview: degraded ? `[degraded] ${preview}` : preview,
      url: test.url,
    };
  } catch (e) {
    return {
      name: test.name,
      ok: false,
      status: 0,
      preview: String(e.message ?? e),
      url: test.url,
    };
  }
}

function writeProxyAudit(proxyResults) {
  const broken = proxyResults.filter((p) => !p.ok);
  const lines = [
    "# Phase 0 — Legacy proxy audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `LEGACY_API_URL: \`${LEGACY_API}\``,
    `LEGACY_SITE: \`${LEGACY_SITE}\``,
    "",
    "v2 forwards via `/api/v1/proxy/[...path]` — use only for endpoints not yet on Prisma.",
    "",
    "## Summary",
    "",
    `| Result | Count |`,
    `|--------|-------|`,
    `| OK (2xx) | ${proxyResults.filter((p) => p.ok).length} |`,
    `| Broken / unreachable | ${broken.length} |`,
    "",
  ];
  if (broken.length) {
    lines.push("## Broken or non-2xx endpoints", "", "| Endpoint | Status | Note |", "|----------|--------|------|");
    for (const p of broken) {
      lines.push(`| ${p.name} | ${p.status} | ${p.preview.slice(0, 60)} |`);
    }
    lines.push("");
  }
  lines.push("## Full probe list", "", "| Endpoint | Status | OK |", "|----------|--------|-----|");
  for (const p of proxyResults) {
    lines.push(`| ${p.name} | ${p.status} | ${p.ok ? "yes" : "no"} |`);
  }
  writeFileSync(resolve(root, "docs", "PHASE0_PROXY_AUDIT.md"), lines.join("\n"));
}

async function main() {
  const report = {
    phase: 0,
    timestamp: new Date().toISOString(),
    useDatabase: process.env.USE_DATABASE === "true",
    databaseUrlSet: Boolean(process.env.DATABASE_URL?.includes("mysql")),
    db: { connected: false, counts: {}, errors: [], optional: {} },
    proxy: [],
    passed: false,
  };

  console.log("=== AbadRaho v2 — Phase 0 Foundation Check ===\n");
  console.log(`USE_DATABASE=${report.useDatabase}`);
  console.log(`DATABASE_URL set=${report.databaseUrlSet}\n`);

  if (report.useDatabase && report.databaseUrlSet) {
    try {
      await prisma.$connect();
      report.db.connected = true;
      console.log("DB: connected ✓\n");

      for (const [key, fn] of REQUIRED_COUNTS) {
        try {
          const count = await fn();
          report.db.counts[key] = count;
          console.log(`  ${key}: ${count}`);
        } catch (e) {
          report.db.errors.push({ model: key, error: String(e.message ?? e) });
          console.log(`  ${key}: ERROR — ${e.message ?? e}`);
        }
      }
      try {
        const brokerCount = await countBrokers();
        report.db.optional.brokers = brokerCount;
        console.log(`  brokers (table or userType -10027): ${brokerCount}`);
      } catch (e) {
        report.db.optional.brokers = null;
        console.log(`  brokers: optional skip — ${e.message ?? e}`);
      }
    } catch (e) {
      report.db.errors.push({ model: "_connect", error: String(e.message ?? e) });
      console.log(`DB: FAILED — ${e.message ?? e}\n`);
    } finally {
      await prisma.$disconnect();
    }
  } else {
    console.log("DB: skipped (USE_DATABASE not true or DATABASE_URL missing)\n");
  }

  console.log("\n--- Legacy proxy audit ---\n");
  for (const test of PROXY_TESTS) {
    const result = await probeLegacy(test);
    report.proxy.push(result);
    console.log(`  ${result.name}: ${result.ok ? "OK" : "FAIL"} (${result.status}) ${result.preview}`);
  }

  const dbOk =
    !report.useDatabase ||
    (report.db.connected && report.db.errors.length === 0 && (report.db.counts.projects ?? 0) > 0);
  const proxyReachable = report.proxy.every((p) => p.status > 0 && p.status < 500);
  const proxyOk = report.proxy.every((p) => p.ok);
  report.proxyReachable = proxyReachable;
  report.passed = dbOk && proxyReachable;

  console.log("\n=== Summary ===");
  console.log(`DB foundation: ${dbOk ? "PASS" : "FAIL"}`);
  const degraded = report.proxy.filter((p) => p.status >= 200 && !p.ok);
  console.log(
    `Legacy proxy:  ${proxyReachable ? "REACHABLE" : "FAIL"}` +
      (degraded.length ? ` (${degraded.length} return errors in body — see PHASE0_PROXY_AUDIT.md)` : "")
  );
  console.log(`Overall Phase 0: ${report.passed ? "PASS ✓" : "NEEDS ATTENTION"}\n`);

  const outPath = resolve(root, "docs", "PHASE0_REPORT.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  writeProxyAudit(report.proxy);
  console.log(`Report written: docs/PHASE0_REPORT.json`);
  console.log(`Proxy audit: docs/PHASE0_PROXY_AUDIT.md`);

  process.exit(report.passed ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
