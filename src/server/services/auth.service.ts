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
  passwordResetEmailText,
  PASSWORD_RESET_TTL_MINUTES,
  sendAuthEmail,
} from "@/lib/mail";
import {
  shouldExposeOtpDev,
  shouldExposeResetUrlDev,
  shouldExposeVerifyUrlDev,
} from "@/lib/otp-dev";
import { sendPhoneOtpWhatsApp } from "@/lib/whatsapp-otp";
import { hashPassword, verifyPassword } from "@/lib/password";
import { passwordProblem } from "@/lib/password-policy";
import type { User } from "@prisma/client";
import { randomInt } from "crypto";
import { checkStoredPhone, phoneLookupVariants } from "@/lib/phone";

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
  return String(randomInt(1000, 10000));
}

/** 4-digit codes only resist guessing with a short lifetime and a small attempt budget. */
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_FAILURES = 5;
/** Daily ceiling on wrong guesses per user, across every code issued that day. */
const OTP_DAILY_MAX_FAILURES = 20;
/** Codes sent per user (submit-phone + resend share it) — also caps WhatsApp spend. */
const OTP_SENDS_PER_WINDOW = 3;
const OTP_SEND_WINDOW_MS = 10 * 60 * 1000;

/** User-facing text for a failed send; Meta's exact reason is logged as [whatsapp:meta]. */
function whatsappFailureMessage(error?: string): string {
  if (error === "no_provider") {
    return "Could not send WhatsApp OTP. Set WHATSAPP_CLOUD_ACCESS_TOKEN and WHATSAPP_CLOUD_PHONE_NUMBER_ID in .env.";
  }
  if (error === "no_phone") return "Add your WhatsApp number first.";
  return "Could not send the WhatsApp code right now. Please try again in a few minutes.";
}

type OtpState = { expiresAt: number; failures: number };

/**
 * Expiry/attempt tracking lives in memory (single Passenger worker) because phone_no_otp only
 * holds the hash. After a restart a pending code has no entry: it stays usable, with a fresh
 * attempt budget and expiry starting at the first guess.
 */
const otpStates = new Map<number, OtpState>();

function markOtpIssued(userId: number) {
  otpStates.set(userId, { expiresAt: Date.now() + OTP_TTL_MS, failures: 0 });
}

function checkOtpSendLimit(userId: number) {
  return checkRateLimit(`otp-send:${userId}`, OTP_SENDS_PER_WINDOW, OTP_SEND_WINDOW_MS);
}

function sweepOtpStates() {
  const now = Date.now();
  for (const [id, state] of otpStates) {
    if (now > state.expiresAt) otpStates.delete(id);
  }
}

function storeOtpHash(otp: string): string {
  return hashStoredSecret(otp);
}

/**
 * Update fields for a phone edit outside the OTP flow (profile form, legacy phone route).
 * A different number drops the "verified" flag and any pending code — otherwise verifying
 * one number and then editing the field would show an unverified number as verified.
 */
async function phoneChangeData(userId: number, phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, "");
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { phoneNumber: true },
  });
  // Same number in another saved format (03xx… vs 9230…) is not a change: keep "verified".
  const currentDigits = (current?.phoneNumber ?? "").replace(/\D/g, "");
  if (currentDigits === digits || (digits && phoneLookupVariants(digits).includes(currentDigits))) {
    return {};
  }
  otpStates.delete(userId);
  return { phoneNumber: digits || null, isPhoneNoVerified: false, phoneNoOtp: null };
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

export async function submitPhoneNumber(
  userId: number,
  phoneNumber: string
): Promise<{ success: boolean; message: string; otpDev?: string; whatsappSent?: boolean; smsSent?: boolean }> {
  const checked = checkStoredPhone(phoneNumber);
  if (!checked.ok) return { success: false, message: checked.message };
  const phone = checked.stored;

  // Match older rows saved as local Pakistani digits too (03xx… / 3xx…).
  const conflict = await prisma.user.findFirst({
    where: { phoneNumber: { in: phoneLookupVariants(phone) }, id: { not: userId }, isArchive: false },
  });
  if (conflict) {
    return { success: false, message: "This WhatsApp number is already in use" };
  }

  const limit = checkOtpSendLimit(userId);
  if (!limit.allowed) {
    return { success: false, message: `Too many attempts. Retry in ${limit.retryAfterSec}s` };
  }

  const otp = generateOtp();
  await prisma.user.update({
    where: { id: userId },
    data: { phoneNumber: phone, phoneNoOtp: storeOtpHash(otp), isPhoneNoVerified: false },
  });
  markOtpIssued(userId);

  const { sent: whatsappSent, error: whatsappError } = await sendPhoneOtpWhatsApp(phone, otp);

  if (!whatsappSent && !shouldExposeOtpDev()) {
    return {
      success: false,
      message:
        whatsappFailureMessage(whatsappError),
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
  if (!user.phoneNoOtp) {
    return { success: false, message: "No active code. Request a new OTP." };
  }

  sweepOtpStates();
  let state = otpStates.get(userId);
  if (!state) {
    state = { expiresAt: Date.now() + OTP_TTL_MS, failures: 0 };
    otpStates.set(userId, state);
  }

  const burnCode = async (message: string) => {
    otpStates.delete(userId);
    await prisma.user.update({ where: { id: userId }, data: { phoneNoOtp: null } });
    return { success: false, message };
  };

  if (Date.now() > state.expiresAt) {
    return burnCode("This code has expired. Request a new OTP.");
  }
  if (!checkRateLimit(`otp-verify-day:${userId}`, OTP_DAILY_MAX_FAILURES, 24 * 60 * 60 * 1000).allowed) {
    return { success: false, message: "Too many incorrect codes today. Try again tomorrow." };
  }

  if (!verifyStoredSecret(otp, user.phoneNoOtp)) {
    state.failures += 1;
    if (state.failures >= OTP_MAX_FAILURES) {
      return burnCode("Too many incorrect codes. Request a new OTP.");
    }
    return {
      success: false,
      message: "Incorrect OTP. Check the code from WhatsApp or request a new one.",
    };
  }

  otpStates.delete(userId);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isPhoneNoVerified: true, phoneNoOtp: null },
  });
  return { success: true, message: "WhatsApp number verified", user: toSafeUser(updated) };
}

export async function resendPhoneOtp(
  userId: number
): Promise<{ success: boolean; message: string; otpDev?: string; whatsappSent?: boolean; smsSent?: boolean }> {
  // Keyed by user only — an IP in the key let callers rotate X-Forwarded-For for unlimited resends.
  const limit = checkOtpSendLimit(userId);
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
  markOtpIssued(userId);

  const phone = user.phoneNumber ?? "";
  const { sent: whatsappSent, error: whatsappError } = phone
    ? await sendPhoneOtpWhatsApp(phone, otp)
    : { sent: false, error: "no_phone" };

  if (!whatsappSent && !shouldExposeOtpDev()) {
    return {
      success: false,
      message:
        whatsappFailureMessage(whatsappError),
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
  const phoneData =
    data.phoneNumber != null ? await phoneChangeData(userId, data.phoneNumber) : {};
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.firstName != null ? { firstName: data.firstName.trim() } : {}),
      ...(data.lastName != null ? { lastName: data.lastName.trim() } : {}),
      ...phoneData,
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
    subject: `Reset your ${siteConfig.name} password`,
    html: passwordResetEmailHtml(resetUrl),
    text: passwordResetEmailText(resetUrl),
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
  // Same rules as signup (the reset form checks them live too).
  const weak = passwordProblem(password);
  if (weak) return { success: false, message: weak };

  const row = await findPasswordResetByToken(token);
  if (!row) {
    return {
      success: false,
      message: "This reset link is invalid or has expired. Request a new link from the forgot password page.",
    };
  }

  const created = row.createdAt?.getTime() ?? 0;
  if (Date.now() - created > PASSWORD_RESET_TTL_MINUTES * 60 * 1000) {
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

  // Linking by email to an account whose email was never verified: whoever set that
  // password never proved they own the inbox (someone could pre-register a victim's email
  // and wait for them to sign in with Google). The provider just proved ownership, so the
  // old password is replaced; the real owner can set one via "forgot password".
  const takeOverUnverified = !user.emailVerifiedAt && !placeholderEmail && user.recordId !== profile.recordId;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(takeOverUnverified ? { password: await hashPassword(randomToken(16)) } : {}),
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
    data: await phoneChangeData(userId, phoneNumber ?? ""),
  });
  return toSafeUser(user);
}

export async function userExists(id: number): Promise<boolean> {
  const count = await prisma.user.count({ where: { id, isArchive: false } });
  return count > 0;
}

// ---------------------------------------------------------------------------------------------
// Signup with WhatsApp verification first: no account exists until the code is confirmed.
// ---------------------------------------------------------------------------------------------

type PendingSignup = {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  phone: string;
  otpHash: string;
  otpExpiresAt: number;
  failures: number;
  expiresAt: number;
};

/**
 * In memory (single Passenger worker, like otpStates). Nothing touches the database until the
 * code is verified, so an abandoned or restarted signup leaves no half-created account.
 */
const pendingSignups = new Map<string, PendingSignup>();
const PENDING_SIGNUP_TTL_MS = 30 * 60 * 1000;

function sweepPendingSignups() {
  const now = Date.now();
  for (const [token, p] of pendingSignups) if (now > p.expiresAt) pendingSignups.delete(token);
}

export type SignupOtpResult = {
  success: boolean;
  message: string;
  token?: string;
  phone?: string;
  otpDev?: string;
};

async function emailOrPhoneTaken(email: string, phone: string): Promise<string | null> {
  if (await findUserByEmail(email)) return "Email already registered";
  const phoneOwner = await prisma.user.findFirst({
    where: { phoneNumber: { in: phoneLookupVariants(phone) }, isArchive: false },
    select: { id: true },
  });
  return phoneOwner ? "This WhatsApp number is already in use" : null;
}

/** Issue + send a fresh code for a pending signup (shared by start / resend / change number). */
async function sendSignupCode(token: string, pending: PendingSignup): Promise<SignupOtpResult> {
  const limit = checkRateLimit(`signup-otp-send:${token}`, OTP_SENDS_PER_WINDOW, OTP_SEND_WINDOW_MS);
  if (!limit.allowed) {
    return { success: false, message: `Too many codes requested. Retry in ${limit.retryAfterSec}s` };
  }
  const otp = generateOtp();
  pending.otpHash = storeOtpHash(otp);
  pending.otpExpiresAt = Date.now() + OTP_TTL_MS;
  pending.failures = 0;

  const { sent, error } = await sendPhoneOtpWhatsApp(pending.phone, otp);
  if (!sent && !shouldExposeOtpDev()) {
    return { success: false, message: whatsappFailureMessage(error) };
  }
  return {
    success: true,
    message: sent ? "We sent a 4-digit code to your WhatsApp." : "Code generated (WhatsApp not configured).",
    token,
    phone: pending.phone,
    ...(!sent && shouldExposeOtpDev() ? { otpDev: otp } : {}),
  };
}

/** Step 1: validate (done by the route) + hold the signup + send the WhatsApp code. */
export async function startSignup(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
}): Promise<SignupOtpResult> {
  if (!isDatabaseEnabled()) return { success: false, message: "Database disabled" };
  sweepPendingSignups();

  const email = input.email.trim().toLowerCase();
  const taken = await emailOrPhoneTaken(email, input.phone);
  if (taken) return { success: false, message: taken };

  const token = randomToken();
  const pending: PendingSignup = {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email,
    passwordHash: await hashPassword(input.password),
    phone: input.phone,
    otpHash: "",
    otpExpiresAt: 0,
    failures: 0,
    expiresAt: Date.now() + PENDING_SIGNUP_TTL_MS,
  };
  pendingSignups.set(token, pending);
  const result = await sendSignupCode(token, pending);
  if (!result.success) pendingSignups.delete(token);
  return result;
}

function getPendingSignup(token: string): PendingSignup | null {
  sweepPendingSignups();
  return token ? (pendingSignups.get(token) ?? null) : null;
}

const SIGNUP_EXPIRED = "Your signup session expired. Please submit the form again.";

export async function resendSignupCode(token: string): Promise<SignupOtpResult> {
  const pending = getPendingSignup(token);
  if (!pending) return { success: false, message: SIGNUP_EXPIRED };
  return sendSignupCode(token, pending);
}

/** "Wrong number?": switch the number inside the verification modal and send a new code. */
export async function changeSignupPhone(token: string, phoneRaw: string): Promise<SignupOtpResult> {
  const pending = getPendingSignup(token);
  if (!pending) return { success: false, message: SIGNUP_EXPIRED };
  const checked = checkStoredPhone(phoneRaw);
  if (!checked.ok) return { success: false, message: checked.message };
  const owner = await prisma.user.findFirst({
    where: { phoneNumber: { in: phoneLookupVariants(checked.stored) }, isArchive: false },
    select: { id: true },
  });
  if (owner) return { success: false, message: "This WhatsApp number is already in use" };
  pending.phone = checked.stored;
  return sendSignupCode(token, pending);
}

/** Step 2: correct code → create the (already phone-verified) account. */
export async function verifySignupCode(
  token: string,
  otp: string
): Promise<{ success: boolean; message: string; user?: SafeUser }> {
  const pending = getPendingSignup(token);
  if (!pending) return { success: false, message: SIGNUP_EXPIRED };
  if (!pending.otpHash || Date.now() > pending.otpExpiresAt) {
    return { success: false, message: "This code has expired. Tap Resend for a new one." };
  }
  if (!checkRateLimit(`signup-otp-verify:${token}`, OTP_DAILY_MAX_FAILURES, PENDING_SIGNUP_TTL_MS).allowed) {
    return { success: false, message: "Too many incorrect codes. Please try again later." };
  }
  if (!verifyStoredSecret(otp, pending.otpHash)) {
    pending.failures += 1;
    if (pending.failures >= OTP_MAX_FAILURES) {
      pending.otpHash = "";
      return { success: false, message: "Too many incorrect codes. Tap Resend for a new one." };
    }
    return { success: false, message: "That code is not right. Check the latest WhatsApp message." };
  }

  // Re-check: someone may have registered the same email/number while this code was pending.
  const taken = await emailOrPhoneTaken(pending.email, pending.phone);
  if (taken) {
    pendingSignups.delete(token);
    return { success: false, message: taken };
  }

  const now = new Date();
  const user = await prisma.user.create({
    data: {
      firstName: pending.firstName,
      lastName: pending.lastName,
      email: pending.email,
      password: pending.passwordHash,
      phoneNumber: pending.phone,
      isPhoneNoVerified: true,
      phoneNoOtp: null,
      // Public signup is website users only — agent/builder roles are admin-assigned (sec-7).
      userTypeId: userTypeIds.websiteUser,
      provider: "WEBSITE",
      createdAt: now,
      updatedAt: now,
    },
  });
  pendingSignups.delete(token);
  return { success: true, message: "Account created", user: toSafeUser(user) };
}
