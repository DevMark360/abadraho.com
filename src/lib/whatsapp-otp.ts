import { siteConfig } from "@/config/site";
import { splitStoredPhone } from "@/lib/phone";

export type WhatsAppOtpSendResult = {
  sent: boolean;
  provider?: string;
  error?: string;
};

/**
 * WhatsApp recipient digits (international, no +). Legacy local Pakistani forms (03xx… / 3xx…)
 * get 92; numbers already saved in international form (any country, e.g. 6581234567 for
 * Singapore) are left as they are.
 */
export function normalizePkPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const { country, national } = splitStoredPhone(digits);
  return country === "PK" && national ? `92${national}` : digits;
}

type MetaTemplateComponent =
  | {
      type: "body";
      parameters: Array<{ type: "text"; text: string }>;
    }
  | {
      type: "button";
      sub_type: "url";
      index: string;
      parameters: Array<{ type: "text"; text: string }>;
    };

function metaApiVersion(): string {
  return process.env.WHATSAPP_CLOUD_API_VERSION?.trim() || "v21.0";
}

/** Build components for Meta authentication OTP templates. */
function buildMetaOtpTemplateComponents(otp: string): MetaTemplateComponent[] {
  const buttonType = (process.env.WHATSAPP_OTP_BUTTON_TYPE ?? "otp").toLowerCase();
  const components: MetaTemplateComponent[] = [
    {
      type: "body",
      parameters: [{ type: "text", text: otp }],
    },
  ];

  if (buttonType === "none") return components;

  // Authentication templates' copy-code / one-tap buttons are sent as sub_type "url" —
  // Meta rejects "otp" as a sub_type, so "otp"/"copy_code"/"url" all map here.
  components.push({
    type: "button",
    sub_type: "url",
    index: "0",
    parameters: [{ type: "text", text: otp }],
  });
  return components;
}

/** Meta WhatsApp Cloud API — requires approved authentication OTP template. */
async function sendViaMetaCloud(phone: string, otp: string): Promise<WhatsAppOtpSendResult> {
  const token = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim();
  const template = process.env.WHATSAPP_OTP_TEMPLATE_NAME?.trim() || "authentication_code";
  const language = process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE?.trim() || "en";
  if (!token || !phoneNumberId) {
    return { sent: false, error: "meta_not_configured" };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${metaApiVersion()}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phone,
          type: "template",
          template: {
            name: template,
            language: { code: language },
            components: buildMetaOtpTemplateComponents(otp),
          },
        }),
        signal: AbortSignal.timeout(20_000),
      }
    );
    const json = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; code?: number };
      messages?: Array<{ id?: string }>;
    };
    if (!res.ok) {
      const detail = json.error?.message ?? "unknown_error";
      console.error("[whatsapp:meta]", res.status, detail);
      return { sent: false, provider: "meta", error: detail };
    }
    return { sent: true, provider: "meta" };
  } catch (e) {
    console.error("[whatsapp:meta]", e);
    return { sent: false, provider: "meta", error: "meta_error" };
  }
}

function isMetaCloudConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_CLOUD_ACCESS_TOKEN?.trim() &&
      process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim()
  );
}

/** Send OTP via Meta WhatsApp Cloud API. */
export async function sendPhoneOtpWhatsApp(
  phone: string,
  otp: string
): Promise<WhatsAppOtpSendResult> {
  const pkPhone = normalizePkPhone(phone);

  if (!isMetaCloudConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[whatsapp:meta] Not configured. OTP for ${pkPhone}: ${otp} (${siteConfig.name})`
      );
    }
    return { sent: false, error: "no_provider" };
  }

  return sendViaMetaCloud(pkPhone, otp);
}

export function isWhatsAppOtpConfigured(): boolean {
  return isMetaCloudConfigured();
}
