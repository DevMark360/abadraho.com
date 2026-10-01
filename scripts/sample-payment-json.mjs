import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const rows = await p.$queryRawUnsafe("SELECT id, json FROM payment_schedule LIMIT 2");
for (const r of rows) {
  console.log("id", r.id);
  console.log(String(r.json).slice(0, 300));
}
await p.$disconnect();
