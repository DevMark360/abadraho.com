/**
 * Create brokers + broker_area and backfill from agent users.
 * Usage: node scripts/create-brokers-table.mjs
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dir = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(dir, "create-brokers-table.sql"), "utf8");

const statements = sql
  .split(";")
  .map((s) => s.replace(/--[^\n]*/g, "").trim())
  .filter((s) => s.length > 0);

async function main() {
  console.log("DATABASE:", process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@"));
  for (const stmt of statements) {
    const preview = stmt.slice(0, 60).replace(/\s+/g, " ");
    console.log("→", preview, "…");
    await prisma.$executeRawUnsafe(stmt);
  }

  const brokerCount = await prisma.broker.count({ where: { isArchive: false } });
  const agentUsers = await prisma.user.count({
    where: { userTypeId: -10027, isArchive: false },
  });
  console.log("\nDone.");
  console.log("  brokers (active):", brokerCount);
  console.log("  agent users:", agentUsers);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
