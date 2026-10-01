import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

for (const t of ["inquiries", "payment_schedule", "contactus"]) {
  console.log("\n===", t, "===");
  const cols = await p.$queryRawUnsafe(`SHOW COLUMNS FROM \`${t}\``);
  console.log(cols.map((c) => c.Field).join(", "));
  const c = Number((await p.$queryRawUnsafe(`SELECT COUNT(*) AS c FROM \`${t}\``))[0].c);
  console.log("rows:", c);
  if (c > 0) {
    const s = await p.$queryRawUnsafe(`SELECT * FROM \`${t}\` ORDER BY id DESC LIMIT 1`);
    console.log("sample keys:", Object.keys(s[0]));
  }
}

await p.$disconnect();
