import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";

export function isAdminRegisterEnabled(): boolean {
  return process.env.ALLOW_ADMIN_REGISTER === "true";
}

export async function registerAdminAccount(input: {
  name: string;
  email: string;
  password: string;
}) {
  if (!isAdminRegisterEnabled()) {
    return {
      success: false,
      message:
        "Admin registration is disabled. Set ALLOW_ADMIN_REGISTER=true in .env to enable (legacy route was often off in production).",
    };
  }
  if (!isDatabaseEnabled()) return { success: false, message: "Database disabled" };

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!name || !email || password.length < 8) {
    return { success: false, message: "Name, email, and password (8+ chars) are required" };
  }

  const existing = await prisma.admin.findFirst({ where: { email } });
  if (existing) return { success: false, message: "Email already registered" };

  const hash = await hashPassword(password);
  await prisma.admin.create({
    data: { name, email, password: hash },
  });

  return { success: true, message: "Admin account created. You can log in now." };
}
