import { z } from "zod";
import { checkEmail } from "@/lib/email-check";
import { checkStoredPhone } from "@/lib/phone";

export const CONTACT_LIMITS = {
  name: 100,
  email: 254,
  phone: 20,
  subject: 200,
  message: 5000,
} as const;

export type ContactFormInput = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

function cleanText(value: string, maxLen: number): string {
  return value
    .replace(/\0/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

/** Any country: validated with the phone rules (stored as international digits, e.g. 9230…). */
export function normalizeContactPhone(
  raw: string
): { ok: true; phone: string } | { ok: false; message: string } {
  const checked = checkStoredPhone(raw);
  return checked.ok ? { ok: true, phone: checked.stored } : { ok: false, message: checked.message };
}

/** Safe Reply-To for nodemailer — blocks header injection and invalid addresses. */
export function sanitizeReplyToEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.length > CONTACT_LIMITS.email) return null;
  if (/[\r\n\0,;<>]/.test(normalized)) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  return normalized;
}

const contactSchema = z.object({
  name: z.string().min(1).max(CONTACT_LIMITS.name),
  email: z.string().email().max(CONTACT_LIMITS.email),
  phone: z.string().min(1).max(CONTACT_LIMITS.phone),
  subject: z.string().min(1).max(CONTACT_LIMITS.subject),
  message: z.string().min(1).max(CONTACT_LIMITS.message),
});

export function parseContactForm(
  body: Record<string, unknown>
): { success: true; data: ContactFormInput } | { success: false; message: string } {
  const raw = {
    name: cleanText(String(body.name ?? ""), CONTACT_LIMITS.name),
    email: cleanText(String(body.email ?? ""), CONTACT_LIMITS.email).toLowerCase(),
    phone: cleanText(String(body.phone ?? body.phone_number ?? ""), CONTACT_LIMITS.phone),
    subject: cleanText(String(body.subject ?? ""), CONTACT_LIMITS.subject),
    message: String(body.message ?? "")
      .replace(/\0/g, "")
      .trim()
      .slice(0, CONTACT_LIMITS.message),
  };

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      message: "Name, email, phone, subject, and message are required",
    };
  }

  const phone = normalizeContactPhone(parsed.data.phone);
  if (!phone.ok) {
    return { success: false, message: phone.message };
  }

  const emailCheck = checkEmail(parsed.data.email);
  if (!emailCheck.ok) {
    return { success: false, message: emailCheck.message };
  }

  const replyTo = sanitizeReplyToEmail(parsed.data.email);
  if (!replyTo) {
    return { success: false, message: "Enter a valid email address" };
  }

  return {
    success: true,
    data: {
      ...parsed.data,
      email: replyTo,
      phone: phone.phone,
      message: parsed.data.message,
    },
  };
}
