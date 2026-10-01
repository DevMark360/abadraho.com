/**
 * Create or reset an admin login.
 * Usage: node scripts/create-admin.mjs <email> <password> [name]
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const [emailArg, passwordArg, nameArg] = process.argv.slice(2);
if (!emailArg || !passwordArg) {
  console.error("Usage: node scripts/create-admin.mjs <email> <password> [name]");
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const password = passwordArg;
const name = nameArg ?? email.split("@")[0];

const prisma = new PrismaClient();
const hash = await bcrypt.hash(password, 10);

await prisma.admin.upsert({
  where: { email },
  create: { email, password: hash, name },
  update: { password: hash, name },
});

console.log(`Admin ready: ${email} / ${password}`);
await prisma.$disconnect();
