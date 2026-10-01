import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
try {
  const exists = await p.$queryRawUnsafe(
    `SELECT COUNT(*) AS c FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'videos'`
  );
  console.log("exists", exists);
  if (Number(exists[0]?.c) > 0) {
    console.log("cols", await p.$queryRawUnsafe("DESCRIBE videos"));
    console.log("sample", await p.$queryRawUnsafe("SELECT * FROM videos LIMIT 2"));
  }
} catch (e) {
  console.error(e);
} finally {
  await p.$disconnect();
}
