"use server";

import { headers } from "next/headers";
import { parseContactForm } from "@/lib/contact-form";
import { honeypotFromFormData, rateLimitUserMessage } from "@/lib/form-spam";
import {
  type FormActionState,
} from "@/lib/form-action-state";
import { clientIp, enforceRateLimits, RATE_LIMITS } from "@/lib/rate-limit";
import {
  createContactInquiry,
} from "@/server/services/public-forms.service";

async function requestIp(): Promise<string> {
  const h = await headers();
  return clientIp({ headers: h } as Request);
}

export async function submitContactForm(
  _prev: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  if (honeypotFromFormData(formData)) {
    return {
      status: "ok",
      message: "Thank you for your inquiry. We will get back to you shortly!",
    };
  }

  const body = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  };

  const parsed = parseContactForm(body as Record<string, unknown>);
  if (!parsed.success) {
    return { status: "error", message: parsed.message };
  }

  const ip = await requestIp();
  const { max, windowMs } = RATE_LIMITS.contact;
  const limit = enforceRateLimits([
    { key: `contact:ip:${ip}`, maxAttempts: max, windowMs },
    { key: `contact:email:${parsed.data.email}`, maxAttempts: max, windowMs },
  ]);
  if (!limit.allowed) {
    return {
      status: "error",
      message: rateLimitUserMessage(limit.retryAfterSec),
    };
  }

  const result = await createContactInquiry(body as Record<string, unknown>);
  if (!result.success) {
    return { status: "error", message: result.message };
  }

  return { status: "ok", message: result.message };
}
