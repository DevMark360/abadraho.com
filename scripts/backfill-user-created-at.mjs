/**
 * Sets created_at / updated_at on users missing timestamps (breaks dashboard analytics).
 * Usage: node scripts/backfill-user-created-at.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const before = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS cnt FROM users WHERE created_at IS NULL`
  );
  console.log("Users missing created_at:", Number(before[0]?.cnt ?? 0));

  const updated = await prisma.$executeRawUnsafe(`
    UPDATE users
    SET
      created_at = COALESCE(created_at, updated_at, NOW()),
      updated_at = COALESCE(updated_at, created_at, NOW())
    WHERE created_at IS NULL OR updated_at IS NULL
  `);
  console.log("Rows updated:", updated);

  const after = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS cnt FROM users WHERE created_at IS NULL`
  );
  console.log("Remaining without created_at:", Number(after[0]?.cnt ?? 0));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
