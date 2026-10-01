import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const cache = new Map();

async function tableExists(tableName) {
  const key = tableName.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  try {
    await p.$queryRawUnsafe(`SELECT 1 FROM \`${tableName}\` LIMIT 1`);
    cache.set(key, true);
    return true;
  } catch (e) {
    const msg = String(e instanceof Error ? e.message : e);
    const missing =
      msg.includes("1146") ||
      msg.includes("doesn't exist") ||
      msg.includes("does not exist");
    if (missing) {
      cache.set(key, false);
      return false;
    }
    throw e;
  }
}

const tools = {
  pitchDecks: await tableExists("broker_pitch_decks"),
  whatsappCards: await tableExists("broker_whatsapp_cards"),
  shortLinks: await tableExists("broker_short_links"),
};
const brokerToolsReady =
  tools.pitchDecks || tools.whatsappCards || tools.shortLinks;

console.log("tools", tools, "brokerToolsReady", brokerToolsReady);

const broker = await p.broker.findFirst({ where: { id: 2, isArchive: false } });
console.log("broker", broker?.id);

if (!brokerToolsReady) {
  console.log("dashboard OK (skipped tool tables)", {
    stats: { pitchDecks: 0, whatsappCards: 0, shortLinks: 0, totalClicks: 0 },
  });
} else {
  console.log("would query prisma tool tables");
}

await p.$disconnect();
