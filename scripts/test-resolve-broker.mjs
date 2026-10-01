import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const userTypeIds = { agent: -10027 };

async function tableExists(tableName) {
  try {
    await p.$queryRawUnsafe(`SELECT 1 FROM \`${tableName}\` LIMIT 1`);
    return true;
  } catch (e) {
    const msg = String(e.message);
    return msg.includes("1146") || msg.includes("doesn't exist");
  }
}

async function resolve(userId) {
  if (!(await tableExists("brokers"))) {
    console.log("tableExists brokers: false");
    return null;
  }
  const linked = await p.broker.findFirst({
    where: { userId, isArchive: false },
  });
  if (linked) return { source: "linked", id: linked.id };

  const user = await p.user.findFirst({
    where: { id: userId, isArchive: false, userTypeId: userTypeIds.agent },
  });
  if (!user) {
    console.log("no agent user", userId);
    return null;
  }

  const email = user.email?.trim().toLowerCase();
  if (email) {
    const byEmail = await p.broker.findFirst({
      where: { isArchive: false, contactEmail: { equals: email } },
    });
    if (byEmail) {
      await p.broker.update({ where: { id: byEmail.id }, data: { userId: user.id } });
      return { source: "email", id: byEmail.id };
    }
  }

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
    });
    return { source: "created", id: created.id };
  } catch (e) {
    console.log("create failed", e.message);
    return null;
  }
}

for (const id of [99, 104, 107]) {
  console.log("user", id, await resolve(id));
}
await p.$disconnect();
