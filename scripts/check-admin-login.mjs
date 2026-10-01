import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const email = process.argv[2] ?? "asif.mark360@gmail.com";
const password = process.argv[3] ?? "Admin@123";

const p = new PrismaClient();
const admin = await p.admin.findUnique({ where: { email } });
console.log(JSON.stringify({
  email,
  exists: Boolean(admin),
  passwordOk: admin ? await bcrypt.compare(password, admin.password) : false,
}, null, 2));
await p.$disconnect();
