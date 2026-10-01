import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const exclude = [-10024, -10027];
const where = `u.is_archive = 0 AND u.user_type_id NOT IN (${exclude.join(",")})`;

try {
  const countRows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS cnt FROM users u WHERE ${where}`
  );
  console.log("count:", Number(countRows[0]?.cnt));

  const rows = await prisma.$queryRawUnsafe(
    `SELECT u.id, u.first_name, u.last_name, u.phone_number, u.email, u.user_type_id, u.created_at,
            ut.user_type_name AS type_name
     FROM users u
     LEFT JOIN user_types ut ON ut.id = u.user_type_id
     WHERE ${where}
     ORDER BY u.created_at DESC
     LIMIT 50 OFFSET 0`
  );
  console.log("rows:", rows.length);
  console.log("JSON test:", JSON.stringify(rows[0]));
} catch (e) {
  console.error("FAIL", e);
}
await prisma.$disconnect();
