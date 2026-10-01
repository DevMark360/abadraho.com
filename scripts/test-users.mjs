import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const total = await p.user.count();
  const items = await p.user.findMany({ take: 3, orderBy: { id: "desc" } });
  console.log("users total:", total, "sample:", items.map((u) => ({ id: u.id, email: u.email })));
} catch (e) {
  console.error("ERR:", e.message);
}
await p.$disconnect();
