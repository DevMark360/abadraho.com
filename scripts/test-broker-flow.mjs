import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const userTypeIds = { agent: -10027 };

function isDatabaseEnabled() {
  return (
    process.env.USE_DATABASE === "true" &&
    Boolean(process.env.DATABASE_URL?.includes("mysql"))
  );
}

async function resolveBrokerForAgentUser(userId) {
  const linked = await p.broker.findFirst({
    where: { userId, isArchive: false },
    select: { id: true, contactPersonName: true, contactEmail: true },
  });
  if (linked) return { step: "linked", broker: linked };

  const user = await p.user.findFirst({
    where: { id: userId, isArchive: false, userTypeId: userTypeIds.agent },
  });
  if (!user) return { step: "no_user", broker: null };

  try {
    const created = await p.broker.create({
      data: {
        contactPersonName: user.firstName,
        contactEmail: user.email,
        contactNumber: user.phoneNumber,
        userId: user.id,
        isActive: true,
        isArchive: false,
      },
      select: { id: true },
    });
    return { step: "created", broker: created };
  } catch (e) {
    return { step: "create_error", error: e.message };
  }
}

async function loadDashboard(brokerId) {
  const broker = await p.broker.findFirst({
    where: { id: brokerId, isArchive: false },
  });
  if (!broker) return { ok: false, reason: "broker row missing" };

  const pitchCount = await p.brokerPitchDeck.count({ where: { brokerId } });
  return { ok: true, pitchCount, brokerId: broker.id };
}

const userId = 107;
console.log("USE_DATABASE", process.env.USE_DATABASE);
console.log("isDatabaseEnabled", isDatabaseEnabled());

const user = await p.user.findFirst({ where: { id: userId } });
console.log("user", user ? { id: user.id, email: user.email, type: user.userTypeId, archive: user.isArchive } : null);

const resolved = await resolveBrokerForAgentUser(userId);
console.log("resolve", resolved);

if (resolved.broker?.id) {
  console.log("dashboard", await loadDashboard(resolved.broker.id));
}

await p.$disconnect();
