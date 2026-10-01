import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const cols = await p.$queryRawUnsafe(`SHOW COLUMNS FROM units`);
console.log("units:", cols.map((c) => c.Field).join(", "));
const sample = await p.$queryRawUnsafe(`SELECT * FROM units WHERE is_archive=0 LIMIT 1`);
console.log("sample keys:", Object.keys(sample[0] || {}));
const rtc = await p.$queryRawUnsafe(`SELECT COUNT(*) c FROM room_type_unit WHERE is_archive=0`);
console.log("room_type_unit rows:", rtc[0].c);
await p.$disconnect();
