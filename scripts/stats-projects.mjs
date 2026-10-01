import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const rows = await p.$queryRaw`
  SELECT status, COUNT(*) as c FROM projects WHERE is_archive = 0 GROUP BY status`;
console.log("status", rows);
const sample = await p.project.findMany({
  where: { isArchive: false },
  take: 3,
  select: { id: true, name: true, latitude: true, longitude: true, status: true },
});
console.log("sample", sample);
await p.$disconnect();
