import { z } from "zod";

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

/** Pakistan mobile/landline — digits only, 10–12 digits after normalization. */
export function normalizeContactPhone(
  raw: string
): { ok: true; phone: string } | { ok: false; message: string } {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 12) {
    return { ok: false, message: "Phone must be 10–12 digits" };
  }
  return { ok: true, phone: digits };
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
