export type ProjectInquiryWebhookPayload = {
  clientName: string;
  email: string;
  phone: string;
  projectName: string;
};

const WEBHOOK_TIMEOUT_MS = 8000;

/**
 * POSTs a project inquiry to the n8n workflow webhook (N8N_INQUIRY_WEBHOOK_URL).
 * No-op when the env var is unset. Never throws — failures are only logged so
 * the inquiry submission itself is never affected.
 */
export async function sendProjectInquiryToN8n(
  payload: ProjectInquiryWebhookPayload
): Promise<void> {
  const url = process.env.N8N_INQUIRY_WEBHOOK_URL?.trim();
  if (!url) return;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[n8n] inquiry webhook responded ${res.status}`);
    }
  } catch (e) {
    console.error("[n8n] inquiry webhook failed", e);
  }
}
