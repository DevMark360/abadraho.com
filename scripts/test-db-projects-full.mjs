import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const items = await p.project.findMany({
    where: { status: 1, isArchive: false },
    include: {
      progress: true,
      owners: { include: { builder: true } },
      units: { take: 20, where: { isArchive: false } },
    },
    take: 2,
  });
  console.log("ok", items.length, items[0]?.name);
} catch (e) {
  console.error("ERR:", e.message);
}
await p.$disconnect();
