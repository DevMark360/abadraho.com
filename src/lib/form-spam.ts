/** Hidden field name — bots often fill every input. */
export const HONEYPOT_FIELD = "_hp";

export function isHoneypotFilled(value: unknown): boolean {
  if (value == null) return false;
  return String(value).trim().length > 0;
}

export function honeypotFromBody(body: Record<string, unknown>): boolean {
  return isHoneypotFilled(body[HONEYPOT_FIELD]);
}

export function honeypotFromFormData(formData: FormData): boolean {
  return isHoneypotFilled(formData.get(HONEYPOT_FIELD));
}

/** User-visible rate-limit message with optional Retry-After seconds. */
export function rateLimitUserMessage(retryAfterSec?: number | null): string {
  if (retryAfterSec != null && retryAfterSec > 0) {
    const mins = Math.max(1, Math.ceil(retryAfterSec / 60));
    return `Too many inquiries. Please try again in about ${mins} minute${mins === 1 ? "" : "s"}.`;
  }
  return "Too many inquiries. Please try again later.";
}
