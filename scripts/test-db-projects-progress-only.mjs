import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const items = await p.project.findMany({
    where: { status: 1, isArchive: false },
    include: { owners: { include: { builder: true } } },
    take: 2,
  });
  console.log("owners ok", items.length);
} catch (e) {
  console.error("ERR:", e.message);
}
try {
  const items = await p.project.findMany({
    where: { status: 1, isArchive: false },
    include: { units: { take: 5, where: { isArchive: false } } },
    take: 1,
  });
  console.log("units ok", items[0]?.units?.length);
} catch (e) {
  console.error("units ERR:", e.message);
}
await p.$disconnect();
