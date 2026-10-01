import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
try {
  const tables = await p.$queryRawUnsafe("SHOW TABLES");
  const names = tables.map((t) => Object.values(t)[0]).filter((n) => String(n).includes("broker"));
  console.log("broker tables:", names.join(", "));
  const cols = await p.$queryRawUnsafe("SHOW COLUMNS FROM brokers");
  console.log("columns:", cols.map((c) => c.Field).join(", "));
  const brokers = await p.$queryRawUnsafe(
    "SELECT id, user_id, contact_email, is_archive FROM brokers ORDER BY id DESC LIMIT 8"
  );
  console.log(
    "brokers:",
    brokers.map((b) => ({
      id: Number(b.id),
      user_id: b.user_id != null ? Number(b.user_id) : null,
      contact_email: b.contact_email,
      is_archive: Number(b.is_archive),
    }))
  );
  const agents = await p.$queryRawUnsafe(
    "SELECT id, email, user_type_id, first_name FROM users WHERE user_type_id = -10027 ORDER BY id DESC LIMIT 8"
  );
  console.log(
    "agents:",
    agents.map((u) => ({
      id: Number(u.id),
      email: u.email,
      user_type_id: Number(u.user_type_id),
      first_name: u.first_name,
    }))
  );
  await p.broker.findMany({ take: 1 });
  console.log("prisma.broker.findMany: OK");
} catch (e) {
  console.error("ERROR:", e.message);
} finally {
  await p.$disconnect();
}
