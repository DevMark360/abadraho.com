import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
try {
  const cols = await p.$queryRawUnsafe("DESCRIBE reviews");
  console.log("columns:", JSON.stringify(cols, null, 2));
  const sample = await p.$queryRawUnsafe(
    "SELECT * FROM reviews ORDER BY id DESC LIMIT 3"
  );
  console.log("sample:", JSON.stringify(sample, null, 2));
} finally {
  await p.$disconnect();
}
