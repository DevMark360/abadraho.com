import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const all = await p.project.count({ where: { isArchive: false } });
const s1 = await p.project.count({ where: { isArchive: false, status: 1 } });
const coords = await p.project.count({
  where: { isArchive: false, latitude: { not: null }, longitude: { not: null } },
});
const s1coords = await p.project.count({
  where: { isArchive: false, status: 1, latitude: { not: null }, longitude: { not: null } },
});
console.log({ all, s1, coords, s1coords });
await p.$disconnect();
