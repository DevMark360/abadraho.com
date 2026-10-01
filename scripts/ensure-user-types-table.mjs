/**
 * Creates legacy `user_types` if missing (common after partial SQL import).
 * Usage: node scripts/ensure-user-types-table.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_ROWS = [
  [-10025, "Builder"],
  [-10024, "Web Site User"],
  [-10023, "Employee"],
  [-10022, "Admin"],
  [-10021, "Super Admin"],
  [-10027, "Agent"],
];

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`user_types\` (
      \`id\` int NOT NULL,
      \`user_type_name\` varchar(255) NOT NULL,
      \`isActive\` int NOT NULL DEFAULT 1,
      \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` timestamp NULL DEFAULT NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  for (const [id, name] of SEED_ROWS) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO user_types (id, user_type_name, isActive)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE user_type_name = VALUES(user_type_name)`,
      id,
      name
    );
  }

  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, user_type_name FROM user_types ORDER BY user_type_name`
  );
  console.log("user_types ready:", rows.length, "rows");
  for (const r of rows) {
    console.log(`  ${r.id}\t${r.user_type_name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
