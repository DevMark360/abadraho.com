import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const count = await p.project.count({ where: { status: 1, isArchive: false } });
  console.log("status=1 count:", count);
  const items = await p.project.findMany({
    where: { status: 1, isArchive: false },
    take: 3,
    select: { id: true, name: true, slug: true },
  });
  console.log("sample:", items);
} catch (e) {
  console.error("ERR:", e.message);
}
await p.$disconnect();
