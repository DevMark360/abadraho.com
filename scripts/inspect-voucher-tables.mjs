import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function describe(table) {
  try {
    const cols = await p.$queryRawUnsafe(`SHOW COLUMNS FROM \`${table}\``);
    const count = await p.$queryRawUnsafe(
      `SELECT COUNT(*) AS c FROM \`${table}\``
    );
    console.log(`\n=== ${table} ===`);
    console.log(cols.map((c) => c.Field).join(", "));
    console.log("rows:", String(count[0]?.c ?? count[0]?.C ?? "?"));
    const sample = await p.$queryRawUnsafe(`SELECT * FROM \`${table}\` LIMIT 1`);
    if (sample[0]) console.log("sample:", sample[0]);
  } catch (e) {
    const msg = String(e?.meta?.message ?? e.message ?? e);
    console.log(`\n=== ${table} ===`);
    console.log(msg.includes("1146") || msg.includes("doesn't exist") ? "(table missing)" : msg);
  }
}

await describe("vouchers");
await describe("user_voucher");
await describe("units_vouchers");

const tables = await p.$queryRawUnsafe(`SHOW TABLES LIKE '%voucher%'`);
console.log("\nvoucher-related tables:", tables.map((t) => Object.values(t)[0]));

await p.$disconnect();
