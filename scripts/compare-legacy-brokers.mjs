/**
 * Compare brokers/agents on legacy DB (markprop_dev) vs v2 DB (markprop_dev_abadraho).
 */
import { PrismaClient } from "@prisma/client";

if (!process.env.LEGACY_DATABASE_URL) {
  console.error("LEGACY_DATABASE_URL is not set. Run with: node --env-file=.env <script>");
  process.exit(1);
}

const v2Url = process.env.DATABASE_URL;
const legacyUrl =
  process.env.LEGACY_DATABASE_URL;

async function probe(url, label) {
  const p = new PrismaClient({ datasources: { db: { url } } });
  const out = { label, db: url.replace(/:[^:@]+@/, ":****@") };

  try {
    const hasBrokers = await p.$queryRawUnsafe(`SHOW TABLES LIKE 'brokers'`);
    out.brokersTable = Array.isArray(hasBrokers) && hasBrokers.length > 0;

    if (out.brokersTable) {
      const c = await p.$queryRawUnsafe(
        `SELECT COUNT(*) AS c FROM brokers WHERE is_archive = 0`
      );
      out.brokersActive = Number(c[0]?.c ?? 0);
      const sample = await p.$queryRawUnsafe(
        `SELECT id, contact_person_name, contact_email, user_id FROM brokers WHERE is_archive = 0 ORDER BY id DESC LIMIT 5`
      );
      out.brokerSample = sample;
    }

    const agents = await p.$queryRawUnsafe(
      `SELECT COUNT(*) AS c FROM users WHERE is_archive = 0 AND user_type_id = -10027`
    );
    out.agentUsers = Number(agents[0]?.c ?? 0);

    const types = await p.$queryRawUnsafe(
      `SELECT id, user_type_name FROM user_types WHERE id = -10027 OR user_type_name LIKE '%gent%'`
    );
    out.agentType = types;
  } catch (e) {
    out.error = String(e.message ?? e);
  } finally {
    await p.$disconnect();
  }
  return out;
}

const [v2, legacy] = await Promise.all([
  probe(v2Url, "v2 (markprop_dev_abadraho)"),
  probe(legacyUrl, "legacy dev (markprop_dev)"),
]);

console.log(JSON.stringify({ v2, legacy }, null, 2));
