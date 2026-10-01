import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
try {
  const cols = await p.$queryRawUnsafe("DESCRIBE progress_status");
  console.log(JSON.stringify(cols, null, 2));
} finally {
  await p.$disconnect();
}
