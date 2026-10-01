import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const rows = await p.$queryRaw`
  SELECT progress, COUNT(*) as c FROM projects WHERE is_archive = 0 GROUP BY progress`;
console.log(rows);
await p.$disconnect();
