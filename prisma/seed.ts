import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "devmarkprop@gmail.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin@123";
  const hash = await bcrypt.hash(password, 10);

  await prisma.admin.upsert({
    where: { email },
    create: { email, password: hash, name: "Dev Admin" },
    update: { password: hash, name: "Dev Admin" },
  });

  console.log(`Admin ready: ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
