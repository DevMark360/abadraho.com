import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const email = process.env.SEED_ADMIN_EMAIL ?? "devmarkprop@gmail.com";
// No default: a fallback password would silently reset the admin login if this ran against prod.
const password = process.env.SEED_ADMIN_PASSWORD;
if (!password) {
  console.error("Set SEED_ADMIN_PASSWORD (e.g. node --env-file=.env scripts/seed-admin.mjs).");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
await prisma.admin.upsert({
  where: { email },
  create: { email, password: hash, name: "Dev Admin" },
  update: { password: hash, name: "Dev Admin" },
});
console.log(`Admin ready: ${email}`);
await prisma.$disconnect();
