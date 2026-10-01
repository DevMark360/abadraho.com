import { prisma } from "../src/lib/prisma.ts";

async function columnExists(table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND column_name = ?`,
    table,
    column
  );
  return Number(rows[0]?.cnt ?? 0) > 0;
}

for (const col of ["gross_area", "net_area"]) {
  if (await columnExists("units", col)) {
    console.log(`skip ${col} — already exists`);
    continue;
  }
  await prisma.$executeRawUnsafe(
    `ALTER TABLE units ADD COLUMN \`${col}\` DECIMAL(16,2) UNSIGNED DEFAULT NULL`
  );
  console.log(`added ${col}`);
}

const hasGross = await columnExists("units", "gross_area");
if (hasGross) {
  const updated = await prisma.$executeRawUnsafe(
    `UPDATE units SET gross_area = covered_area WHERE gross_area IS NULL AND covered_area IS NOT NULL`
  );
  console.log("migrated legacy covered_area -> gross_area", updated);
}

await prisma.$disconnect();
