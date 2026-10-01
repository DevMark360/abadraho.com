import { PrismaClient } from "@prisma/client";

if (!process.env.LEGACY_DATABASE_URL) {
  console.error("LEGACY_DATABASE_URL is not set. Run with: node --env-file=.env <script>");
  process.exit(1);
}

const legacyUrl = process.env.LEGACY_DATABASE_URL;
const v2Url = process.env.DATABASE_URL;

async function inspect(url, label) {
  const p = new PrismaClient({ datasources: { db: { url } } });
  console.log("\n===", label, "===");
  try {
    const hasBrokers = await p.$queryRawUnsafe(`SHOW TABLES LIKE 'brokers'`);
    if (!hasBrokers.length) {
      console.log("brokers table: MISSING");
    } else {
      const cols = await p.$queryRawUnsafe(`SHOW COLUMNS FROM brokers`);
      console.log("brokers columns:", cols.map((c) => c.Field).join(", "));
      const count = await p.$queryRawUnsafe(`SELECT COUNT(*) AS c FROM brokers`);
      console.log("brokers rows:", Number(count[0]?.c ?? 0));
    }

    const types = await p.$queryRawUnsafe(
      `SELECT id, user_type_name FROM user_types WHERE id = -10027 OR user_type_name LIKE '%Agent%'`
    );
    console.log("agent user_type:", types);

    const agents = await p.$queryRawUnsafe(
      `SELECT COUNT(*) AS c FROM users WHERE user_type_id = -10027 AND is_archive = 0`
    );
    console.log("agent users (active):", Number(agents[0]?.c ?? 0));

    const agentSample = await p.$queryRawUnsafe(
      `SELECT id, first_name, last_name, email, phone_number FROM users WHERE user_type_id = -10027 LIMIT 5`
    );
    if (agentSample.length) console.log("agent sample:", agentSample);
  } catch (e) {
    console.log("error:", e.message);
  }
  await p.$disconnect();
}

await inspect(legacyUrl, "markprop_dev (dev.abadraho.com .env)");
await inspect(v2Url, "markprop_dev_abadraho (v2 .env)");
