import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function tableExists(tableName) {
  try {
    await p.$queryRawUnsafe(`SELECT 1 FROM \`${tableName}\` LIMIT 1`);
    return true;
  } catch (e) {
    const msg = String(e.message);
    return msg.includes("1146") || msg.includes("doesn't exist") || msg.includes("does not exist");
  }
}

for (const t of ["brokers", "broker_pitch_decks", "broker_whatsapp_cards", "broker_short_links"]) {
  console.log(t, await tableExists(t));
}

await p.$disconnect();
