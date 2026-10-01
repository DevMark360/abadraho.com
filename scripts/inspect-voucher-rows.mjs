import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const rows = await p.$queryRawUnsafe(
  `SELECT id, code, model_id, status, data FROM vouchers ORDER BY id DESC LIMIT 15`
);
for (const r of rows) {
  let parsed = {};
  try {
    parsed = JSON.parse(r.data || "{}");
  } catch {}
  console.log({
    id: String(r.id),
    code: r.code,
    model_id: String(r.model_id),
    keys: Object.keys(parsed),
    name: parsed.name,
    discount_by: parsed.discount_by,
  });
}
const cnt = await p.$queryRawUnsafe(`SELECT COUNT(*) c FROM user_voucher`);
console.log("user_voucher count:", cnt[0]);
await p.$disconnect();
