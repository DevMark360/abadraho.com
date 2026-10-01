import { isDatabaseEnabled } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { userTypeIds } from "@/config/site";
import { siteConfig } from "@/config/site";
import {
  type AuthAttemptResult,
  LOGIN_FAILURE,
} from "@/lib/auth-errors";
import { hashStoredSecret, verifyStoredSecret } from "@/lib/stored-secret-hash";
import { emailVerificationHash, randomToken, verifyEmailHash } from "@/lib/tokens";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  emailVerifyEmailHtml,
  passwordResetEmailHtml,
  sendAuthEmail,
} from "@/lib/mail";
import {
  shouldExposeOtpDev,
  shouldExposeResetUrlDev,
  shouldExposeVerifyUrlDev,
} from "@/lib/otp-dev";
import { sendPhoneOtpWhatsApp } from "@/lib/whatsapp-otp";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { User } from "@prisma/client";

export type SafeUser = {
  id: number;
  email: string | null;
  firstName: string;
  lastName: string | null;
  phoneNumber: string | null;
  userTypeId: number | null;
  isPhoneNoVerified: boolean;
  emailVerifiedAt: Date | null;
};

function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function storeOtpHash(otp: string): string {
  return hashStoredSecret(otp);
}

async function findPasswordResetByToken(plainToken: string) {
  const hashed = hashStoredSecret(plainToken);
  const byHash = await prisma.passwordReset.findFirst({ where: { token: hashed } });
  if (byHash) return byHash;
  return prisma.passwordReset.findFirst({ where: { token: plainToken } });
}

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phoneNumber: user.phoneNumber,
    userTypeId: user.userTypeId,
    isPhoneNoVerified: user.isPhoneNoVerified,
    emailVerifiedAt: user.emailVerifiedAt,
  };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  if (!isDatabaseEnabled()) return null;
  return prisma.user.findFirst({
    where: { email, isArchive: false },
  });
}

async function findPasswordResetAccount(
  email: string
): Promise<{ email: string } | null> {
  const normalized = email.trim().toLowerCase();
  const user = await findUserByEmail(normalized);
  if (user?.email) return { email: user.email };

  const admin = await prisma.admin.findFirst({
    where: { email: normalized },
    select: { email: true },
  });
  if (admin?.email) return { email: admin.email };

  return null;
}

export async function findUserById(id: number): Promise<User | null> {
  if (!isDatabaseEnabled()) return null;
  return prisma.user.findFirst({
    where: { id, isArchive: false },
  });
}

export async function authenticateUserAttempt(
  email: string,
  password: string
): Promise<AuthAttemptResult<SafeUser>> {
  if (!isDatabaseEnabled()) {
    return { ok: false, reason: LOGIN_FAILURE.EMAIL_NOT_FOUND };
  }
  try {
    const user = await findUserByEmail(email.trim().toLowerCase());
    if (!user) return { ok: false, reason: LOGIN_FAILURE.EMAIL_NOT_FOUND };
    if (!user.password) {
      return {
        ok: false,
        reason: LOGIN_FAILURE.OAUTH_ONLY,
        provider: user.provider,
      };
    }
    if (!(await verifyPassword(password, user.password))) {
      return { ok: false, reason: LOGIN_FAILURE.WRONG_PASSWORD };
    }
    return { ok: true, value: toSafeUser(user) };
  } catch {
    return { ok: false, reason: LOGIN_FAILURE.EMAIL_NOT_FOUND };
  }
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<SafeUser | null> {
  const result = await authenticateUserAttempt(email, password);
  return result.ok ? result.value : null;
}

export type RegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
};

export async function registerUser(
  input: RegisterInput
): Promise<{ user: SafeUser } | { error: string }> {
  if (!isDatabaseEnabled()) {
    return { error: "Database disabled" };
  }

  const email = input.email.trim().toLowerCase();
  const existing = await findUserByEmail(email);
  if (existing) return { error: "Email already registered" };

  // Public signup is website users only — agent/builder roles are admin-assigned (sec-7).
  const userTypeId = userTypeIds.websiteUser;

  const hash = await hashPassword(input.password);
  const now = new Date();
  const user = await prisma.user.create({
    data: {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email,
      password: hash,
      phoneNumber: input.phoneNumber?.trim() || null,
      userTypeId,
      provider: "WEBSITE",
      phoneNoOtp: input.phoneNumber ? storeOtpHash(generateOtp()) : null,
      createdAt: now,
      updatedAt: now,
    },
  });

  return { user: toSafeUser(user) };
}

export async function submitPhoneNumber(
  userId: number,
  phoneNumber: string
): Promise<{ success: boolean; message: string; otpDev?: string; whatsappSent?: boolean; smsSent?: boolean }> {
  const phone = phoneNumber.replace(/\D/g, "");
  if (phone.length < 10 || phone.length > 12) {
    return { success: false, message: "WhatsApp number must be 10–12 digits" };
  }

  const conflict = await prisma.user.findFirst({
    where: { phoneNumber: phone, id: { not: userId }, isArchive: false },
  });
  if (conflict) {
    return { success: false, message: "This WhatsApp number is already in use" };
  }

  const otp = generateOtp();
  await prisma.user.update({
    where: { id: userId },
    data: { phoneNumber: phone, phoneNoOtp: storeOtpHash(otp), isPhoneNoVerified: false },
  });

  const { sent: whatsappSent } = await sendPhoneOtpWhatsApp(phone, otp);

  if (!whatsappSent && !shouldExposeOtpDev()) {
    return {
      success: false,
      message:
        "Could not send WhatsApp OTP. Set WHATSAPP_CLOUD_ACCESS_TOKEN and WHATSAPP_CLOUD_PHONE_NUMBER_ID in .env.",
      whatsappSent: false,
      smsSent: false,
    };
  }

  const out: {
    success: boolean;
    message: string;
    otpDev?: string;
    whatsappSent?: boolean;
    smsSent?: boolean;
  } = {
    success: true,
    message: whatsappSent
      ? "OTP sent to your WhatsApp number"
      : "OTP generated (WhatsApp not configured)",
    whatsappSent,
    smsSent: whatsappSent,
  };
  if (!whatsappSent && shouldExposeOtpDev()) {
    out.otpDev = otp;
  }
  return out;
}

export async function verifyPhoneOtp(
  userId: number,
  otp: string
): Promise<{ success: boolean; message: string; user?: SafeUser }> {
  const user = await findUserById(userId);
  if (!user) return { success: false, message: "User not found" };
  if (!verifyStoredSecret(otp, user.phoneNoOtp)) {
    return {
      success: false,
      message: "Incorrect OTP. Check the code from WhatsApp or request a new one.",
    };
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isPhoneNoVerified: true, phoneNoOtp: null },
  });
  return { success: true, message: "WhatsApp number verified", user: toSafeUser(updated) };
}

export async function resendPhoneOtp(
  userId: number,
  rateKey: string
): Promise<{ success: boolean; message: string; otpDev?: string; whatsappSent?: boolean; smsSent?: boolean }> {
  const limit = checkRateLimit(`otp:${rateKey}`, 3, 10 * 60 * 1000);
  if (!limit.allowed) {
    return {
      success: false,
      message: `Too many attempts. Retry in ${limit.retryAfterSec}s`,
    };
  }

  const user = await findUserById(userId);
  if (!user) return { success: false, message: "User not found" };

  const otp = generateOtp();
  await prisma.user.update({
    where: { id: userId },
    data: { phoneNoOtp: storeOtpHash(otp) },
  });

  const phone = user.phoneNumber ?? "";
  const { sent: whatsappSent } = phone ? await sendPhoneOtpWhatsApp(phone, otp) : { sent: false };

  if (!whatsappSent && !shouldExposeOtpDev()) {
    return {
      success: false,
      message:
        "Could not send WhatsApp OTP. Set WHATSAPP_CLOUD_ACCESS_TOKEN and WHATSAPP_CLOUD_PHONE_NUMBER_ID in .env.",
      whatsappSent: false,
      smsSent: false,
    };
  }

  const out: {
    success: boolean;
    message: string;
    otpDev?: string;
    whatsappSent?: boolean;
    smsSent?: boolean;
  } = {
    success: true,
    message: whatsappSent
      ? "OTP resent to your WhatsApp number"
      : "OTP resent (WhatsApp not configured)",
    whatsappSent,
    smsSent: whatsappSent,
  };
  if (!whatsappSent && shouldExposeOtpDev()) {
    out.otpDev = otp;
  }
  return out;
}

export async function updateProfile(
  userId: number,
  data: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    address?: string;
    city?: string;
    aboutMe?: string;
  }
): Promise<SafeUser | null> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.firstName != null ? { firstName: data.firstName.trim() } : {}),
      ...(data.lastName != null ? { lastName: data.lastName.trim() } : {}),
      ...(data.phoneNumber != null ? { phoneNumber: data.phoneNumber.trim() } : {}),
      ...(data.address != null ? { address: data.address } : {}),
      ...(data.city != null ? { city: data.city } : {}),
      ...(data.aboutMe != null ? { aboutMe: data.aboutMe } : {}),
      updatedAt: new Date(),
    },
  });
  return toSafeUser(user);
}

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const user = await findUserById(userId);
  if (!user) return { success: false, message: "User not found" };
  if (!(await verifyPassword(currentPassword, user.password))) {
    return { success: false, message: "Current password is incorrect" };
  }
  if (newPassword.length < 8) {
    return { success: false, message: "Password must be at least 8 characters" };
  }
  const hash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { password: hash } });
  return { success: true, message: "Password updated" };
}

export async function requestPasswordReset(
  email: string,
  opts?: { authenticatedEmail?: string | null }
): Promise<{ success: boolean; message: string; resetUrlDev?: string }> {
  const normalized = email.trim().toLowerCase();
  const account = await findPasswordResetAccount(normalized);
  if (!account) {
    return { success: true, message: "If that email exists, a reset link was sent" };
  }

  const token = randomToken(30);
  await prisma.passwordReset.deleteMany({ where: { email: account.email } });
  await prisma.passwordReset.create({
    data: { email: account.email, token: hashStoredSecret(token), createdAt: new Date() },
  });

  const base = (process.env.AUTH_URL ?? siteConfig.url).replace(/\/$/, "");
  const resetUrl = `${base}/change-password/${token}`;
  const mail = await sendAuthEmail({
    to: account.email,
    subject: "Reset your password",
    html: passwordResetEmailHtml(resetUrl),
    text: resetUrl,
  });

  if (!mail.sent) {
    console.error("[auth] password reset email failed for", account.email);
  }

  const accountEmail = account.email.trim().toLowerCase();
  const authenticatedEmail = opts?.authenticatedEmail?.trim().toLowerCase() ?? null;
  const canExposeDevUrl =
    shouldExposeResetUrlDev() &&
    authenticatedEmail != null &&
    authenticatedEmail === accountEmail;

  if (shouldExposeResetUrlDev() && !mail.sent && !canExposeDevUrl) {
    console.info(`[auth] password reset link for ${accountEmail}: ${resetUrl}`);
  }

  const out: { success: boolean; message: string; resetUrlDev?: string } = {
    success: true,
    message: "If that email exists, a reset link was sent",
  };
  if (!mail.sent && canExposeDevUrl) {
    out.resetUrlDev = resetUrl;
    out.message = "Could not send email. Configure MAIL_* in .env or use the link below.";
  }
  return out;
}

export async function resetPasswordWithToken(
  token: string,
  password: string
): Promise<{ success: boolean; message: string }> {
  if (password.length < 8) {
    return { success: false, message: "Password must be at least 8 characters" };
  }

  const row = await findPasswordResetByToken(token);
  if (!row) {
    return {
      success: false,
      message: "This reset link is invalid or has expired. Request a new link from the forgot password page.",
    };
  }

  const created = row.createdAt?.getTime() ?? 0;
  if (Date.now() - created > 60 * 60 * 1000) {
    await prisma.passwordReset.deleteMany({ where: { token: row.token } });
    return {
      success: false,
      message: "This reset link has expired. Request a new link from the forgot password page.",
    };
  }

  const hash = await hashPassword(password);
  const user = await findUserByEmail(row.email);
  if (user) {
    await prisma.user.update({ where: { id: user.id }, data: { password: hash } });
  } else {
    const admin = await prisma.admin.findFirst({ where: { email: row.email } });
    if (!admin) return { success: false, message: "User not found" };
    await prisma.admin.update({ where: { id: admin.id }, data: { password: hash } });
  }
  await prisma.passwordReset.deleteMany({ where: { email: row.email } });

  return { success: true, message: "Password reset successful" };
}

export async function verifyEmail(
  userId: number,
  hash: string
): Promise<{ success: boolean; message: string; user?: SafeUser }> {
  const user = await findUserById(userId);
  if (!user?.email) return { success: false, message: "User not found" };

  if (!verifyEmailHash(user.id, user.email, hash)) {
  return {
      success: false,
      message:
        "Invalid or expired verification link. Use Resend verification from your profile while signed in.",
    };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date() },
  });
  return { success: true, message: "Email verified", user: toSafeUser(updated) };
}

export async function resendVerificationEmail(
  userId: number
): Promise<{ success: boolean; message: string; verifyUrlDev?: string }> {
  const limit = checkRateLimit(`email-verify:${userId}`, 6, 60 * 1000);
  if (!limit.allowed) {
    return { success: false, message: "Too many resend attempts" };
  }

  const user = await findUserById(userId);
  if (!user?.email) return { success: false, message: "No email on account" };
  if (user.emailVerifiedAt) {
    return { success: false, message: "Email already verified" };
  }

  const email = user.email.trim().toLowerCase();
  const hash = emailVerificationHash(user.id, email);
  const base = (process.env.AUTH_URL ?? siteConfig.url).replace(/\/$/, "");
  const verifyUrl = `${base}/verify-email?id=${user.id}&hash=${hash}`;
  const mail = await sendAuthEmail({
    to: email,
    subject: "Verify your email",
    html: emailVerifyEmailHtml(verifyUrl),
    text: verifyUrl,
  });

  const out: { success: boolean; message: string; verifyUrlDev?: string } = {
    success: mail.sent,
    message: mail.sent
      ? "Verification email sent"
      : "Could not send email. Configure MAIL_* in .env.",
  };
  if (!mail.sent && shouldExposeVerifyUrlDev()) {
    out.verifyUrlDev = verifyUrl;
    out.message = "Could not send email. Configure MAIL_* in .env or use the link below.";
    out.success = true;
  }
  return out;
}

export async function findOrCreateOAuthUser(profile: {
  provider: "GOOGLE" | "FACEBOOK";
  recordId: string;
  email: string;
  name: string;
  picture?: string;
}): Promise<SafeUser> {
  if (!isDatabaseEnabled()) {
    throw new Error("Database not configured");
  }

  const email = profile.email.trim().toLowerCase();
  const placeholderEmail = email.endsWith("@facebook.local");
  const now = new Date();

  let user = await prisma.user.findFirst({
    where: { recordId: profile.recordId, isArchive: false },
  });

  if (!user && !placeholderEmail) {
    user = await prisma.user.findFirst({
      where: { email, isArchive: false },
    });
  }

  if (!user) {
    const parts = profile.name.trim().split(/\s+/);
    const firstName = parts[0] ?? profile.name;
    const lastName = parts.slice(1).join(" ") || null;
    const hash = await hashPassword(randomToken(16));
    user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: profile.email,
        password: hash,
        recordId: profile.recordId,
        provider: profile.provider,
        avatar: profile.picture,
        userTypeId: userTypeIds.websiteUser,
        emailVerifiedAt: placeholderEmail ? null : now,
        createdAt: now,
        updatedAt: now,
      },
    });
    return toSafeUser(user);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      recordId: profile.recordId,
      provider: profile.provider,
      avatar: profile.picture ?? user.avatar ?? undefined,
      emailVerifiedAt: user.emailVerifiedAt ?? (placeholderEmail ? undefined : now),
      updatedAt: now,
    },
  });

  return toSafeUser(updated);
}

export async function updatePhoneForUser(
  userId: number,
  phoneNumber: string | null
): Promise<SafeUser | null> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { phoneNumber },
  });
  return toSafeUser(user);
}

export async function userExists(id: number): Promise<boolean> {
  const count = await prisma.user.count({ where: { id, isArchive: false } });
  return count > 0;
}
