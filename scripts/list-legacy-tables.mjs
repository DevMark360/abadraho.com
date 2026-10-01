import { PrismaClient } from "@prisma/client";

if (!process.env.LEGACY_DATABASE_URL) {
  console.error("LEGACY_DATABASE_URL is not set. Run with: node --env-file=.env <script>");
  process.exit(1);
}

const p = new PrismaClient({
  datasources: {
    db: { url: process.env.LEGACY_DATABASE_URL },
  },
});

const byType = await p.$queryRawUnsafe(
  `SELECT user_type_id, COUNT(*) AS c FROM users WHERE is_archive = 0 GROUP BY user_type_id ORDER BY c DESC`
);
console.log("users by user_type_id:", byType);

const brokers = await p.$queryRawUnsafe(`SELECT * FROM brokers LIMIT 10`);
console.log("\nbrokers rows:", brokers.length);
if (brokers.length) console.log(brokers);

await p.$disconnect();
