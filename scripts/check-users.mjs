import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const total = await p.user.count({ where: { isArchive: false } });
  const byType = await p.$queryRawUnsafe(
    "SELECT user_type_id, COUNT(*) as c FROM users WHERE is_archive = 0 GROUP BY user_type_id"
  );
  const staff = await p.$queryRawUnsafe(
    "SELECT COUNT(*) as c FROM users u WHERE u.is_archive = 0 AND (u.user_type_id IS NULL OR u.user_type_id NOT IN (-10024, -10027))"
  );
  const strict = await p.$queryRawUnsafe(
    "SELECT COUNT(*) as c FROM users u WHERE u.is_archive = 0 AND u.user_type_id NOT IN (-10024, -10027)"
  );
  console.log("total active:", total);
  console.log("by type:", byType);
  console.log("staff with NULL ok:", staff);
  console.log("staff strict NOT IN:", strict);
  const sample = await p.$queryRawUnsafe(
    `SELECT u.id, u.first_name, u.email, u.user_type_id, ut.user_type_name
     FROM users u LEFT JOIN user_types ut ON ut.id = u.user_type_id
     WHERE u.is_archive = 0 LIMIT 5`
  );
  console.log("sample:", sample);
} catch (e) {
  console.error("ERR", e);
} finally {
  await p.$disconnect();
}
