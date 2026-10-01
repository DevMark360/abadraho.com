/**
 * Compare markprop_dev vs markprop_dev_abadraho (brokers, agents, key tables).
 */
import { PrismaClient } from "@prisma/client";

if (!process.env.LEGACY_DATABASE_URL) {
  console.error("LEGACY_DATABASE_URL is not set. Run with: node --env-file=.env <script>");
  process.exit(1);
}

const dbs = [
  {
    label: "markprop_dev",
    url: process.env.LEGACY_DATABASE_URL,
  },
  {
    label: "markprop_dev_abadraho",
    url: process.env.DATABASE_URL,
  },
];

async function q(p, sql, params = []) {
  return params.length ? p.$queryRawUnsafe(sql, ...params) : p.$queryRawUnsafe(sql);
}

async function inspect({ label, url }) {
  const p = new PrismaClient({ datasources: { db: { url } } });
  const report = { label };

  try {
    const tables = await q(p, "SHOW TABLES");
    const names = tables.map((x) => Object.values(x)[0]);
    report.tables = names.sort();

    const counts = {};
    for (const t of [
      "users",
      "projects",
      "builders",
      "brokers",
      "inquiries",
      "user_search_history",
      "user_search_histories",
    ]) {
      if (names.includes(t)) {
        counts[t] = Number((await q(p, `SELECT COUNT(*) AS c FROM \`${t}\``))[0].c);
      }
    }
    report.rowCounts = counts;

    if (names.includes("brokers")) {
      const cols = await q(p, "SHOW COLUMNS FROM brokers");
      report.brokersSchema = cols.map((c) => c.Field);
    }

    if (names.includes("users")) {
      report.agentUsers = Number(
        (
          await q(
            p,
            "SELECT COUNT(*) AS c FROM users WHERE is_archive = 0 AND user_type_id = -10027"
          )
        )[0].c
      );
    }
  } catch (e) {
    report.error = e.message;
  } finally {
    await p.$disconnect();
  }
  return report;
}

for (const db of dbs) {
  const r = await inspect(db);
  console.log("\n" + "=".repeat(50));
  console.log(r.label);
  console.log("Tables:", r.tables?.length);
  console.log("Row counts:", r.rowCounts);
  console.log("Agent users (-10027):", r.agentUsers ?? "n/a");
  console.log("brokers schema:", r.brokersSchema?.join(", ") ?? "no table");
}
