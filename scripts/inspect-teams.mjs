import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
try {
  const teams = await p.$queryRawUnsafe(
    "SELECT id, name, slug, team_lead_id FROM teams ORDER BY id DESC LIMIT 5"
  );
  console.log("teams", teams);
  const tu = await p.$queryRawUnsafe(
    "SELECT team_id, user_id, status FROM team_users LIMIT 5"
  );
  console.log("team_users", tu);
  const tb = await p.$queryRawUnsafe(
    "SELECT team_id, builder_id, status FROM team_builders LIMIT 5"
  );
  console.log("team_builders", tb);
} finally {
  await p.$disconnect();
}
