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

const users = Number((await p.$queryRawUnsafe("SELECT COUNT(*) AS c FROM users"))[0].c);
const brokers = Number((await p.$queryRawUnsafe("SELECT COUNT(*) AS c FROM brokers"))[0].c);
const agentUsers = Number(
  (await p.$queryRawUnsafe("SELECT COUNT(*) AS c FROM users WHERE user_type_id = -10027"))[0].c
);

console.log({ database: "markprop_dev (dev.abadraho.com)", users, brokers, agentUsers });

await p.$disconnect();
