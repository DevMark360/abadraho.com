import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function tableExists(tableName) {
  try {
    await p.$queryRawUnsafe(`SELECT 1 FROM \`${tableName}\` LIMIT 1`);
    return { exists: true };
  } catch (e) {
    return { exists: false, msg: e.message, code: e.code };
  }
}

const tables = await p.$queryRaw`SHOW TABLES LIKE 'broker%'`;
console.log("SHOW TABLES broker%", tables);

for (const t of ["broker_pitch_decks", "broker_whatsapp_cards", "broker_short_links"]) {
  console.log(t, await tableExists(t));
  try {
    const c = await p.brokerPitchDeck.count({ where: { brokerId: 2 } }).catch((e) => ({ err: e.code, msg: e.message }));
    if (t === "broker_pitch_decks") console.log("  prisma count", c);
  } catch (e) {
    console.log("  prisma err", e.code);
  }
}

try {
  const c = await p.brokerPitchDeck.count({ where: { brokerId: 2 } });
  console.log("pitch count", c);
} catch (e) {
  console.log("pitch count error", e.code, e.meta);
}

await p.$disconnect();
