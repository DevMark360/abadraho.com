import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const pt = await p.$queryRawUnsafe(`SHOW COLUMNS FROM project_type`);
  console.log("project_type cols:", pt.map((c) => c.Field).join(", "));
  const ptCnt = await p.$queryRawUnsafe(`SELECT COUNT(*) c FROM project_type`);
  const ptActive = await p.$queryRawUnsafe(`SELECT COUNT(*) c FROM project_type WHERE is_archive=0`);
  console.log("project_type rows:", String(ptCnt[0].c), "active:", String(ptActive[0].c));
  const rt = await p.$queryRawUnsafe(`SHOW COLUMNS FROM room_types`);
  console.log("room_types cols:", rt.map((c) => c.Field).join(", "));
  const rtCnt = await p.$queryRawUnsafe(`SELECT COUNT(*) c FROM room_types WHERE is_archive=0`);
  console.log("room_types active:", String(rtCnt[0].c));
} catch (e) {
  console.error(e);
}
await p.$disconnect();
