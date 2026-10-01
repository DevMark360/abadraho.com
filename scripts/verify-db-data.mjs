/**
 * Quick check that legacy data is visible in v2's MySQL database.
 * Usage: node scripts/verify-db-data.mjs
 */
import { createPrismaClient } from "./lib/create-prisma.mjs";

const prisma = createPrismaClient();

const tables = [
  ["projects", () => prisma.project.count({ where: { isArchive: false } })],
  ["units", () => prisma.unit.count({ where: { isArchive: false } })],
  ["users", () => prisma.user.count({ where: { isArchive: false } })],
  ["builders", () => prisma.builder.count()],
  ["inquiries", () => prisma.inquiry.count()],
  ["blogs", () => prisma.blog.count()],
  ["vouchers", () => prisma.voucher.count()],
  ["tags", () => prisma.tag.count()],
  ["admins", () => prisma.admin.count()],
];

async function main() {
  console.log("DATABASE_URL:", process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@"));
  console.log("USE_DATABASE:", process.env.USE_DATABASE);
  console.log("");

  for (const [name, fn] of tables) {
    try {
      const n = await fn();
      console.log(`${name.padEnd(12)} ${n}`);
    } catch (e) {
      console.log(`${name.padEnd(12)} ERROR: ${e.message}`);
    }
  }

  const staff = await prisma.user.count({
    where: {
      isArchive: false,
      userTypeId: { in: [-10021, -10022, -10023, -10025] },
    },
  });
  console.log(`${"staff users".padEnd(12)} ${staff}`);
  console.log("\nAdmin login: staff email from `users` or `admins` table.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
