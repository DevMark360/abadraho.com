import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "devmarkprop@gmail.com";
  // No default: a fallback password would silently reset the admin login if this ran against prod.
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) throw new Error("Set SEED_ADMIN_PASSWORD before seeding.");
  const hash = await bcrypt.hash(password, 10);

  await prisma.admin.upsert({
    where: { email },
    create: { email, password: hash, name: "Dev Admin" },
    update: { password: hash, name: "Dev Admin" },
  });

  console.log(`Admin ready: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
