import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const email = process.env.SEED_ADMIN_EMAIL ?? "devmarkprop@gmail.com";
const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin@123";

const hash = await bcrypt.hash(password, 10);
await prisma.admin.upsert({
  where: { email },
  create: { email, password: hash, name: "Dev Admin" },
  update: { password: hash, name: "Dev Admin" },
});
console.log(`Admin ready: ${email} / ${password}`);
await prisma.$disconnect();
