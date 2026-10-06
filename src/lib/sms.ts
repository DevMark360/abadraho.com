import { siteConfig } from "@/config/site";
import { splitStoredPhone } from "@/lib/phone";

export type SmsSendResult = { sent: boolean; provider?: string; error?: string };

/**
 * Recipient digits (international, no +). Legacy local Pakistani forms (03xx… / 3xx…) get 92;
 * numbers already saved in international form (any country) are left as they are.
 */
export function normalizePkPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const { country, national } = splitStoredPhone(digits);
  return country === "PK" && national ? `92${national}` : digits;
}

function otpMessage(otp: string): string {
  return `Your ${siteConfig.name} verification code is ${otp}`;
}

async function sendViaTwilio(phone: string, message: string): Promise<SmsSendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) return { sent: false };

  const to = phone.startsWith("+") ? phone : `+${phone}`;
  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const params = new URLSearchParams({ To: to, From: from, Body: message });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
        signal: AbortSignal.timeout(20_000),
      }
    );
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error("[sms:twilio]", res.status, err.slice(0, 200));
      return { sent: false, provider: "twilio", error: "twilio_failed" };
    }
    return { sent: true, provider: "twilio" };
  } catch (e) {
    console.error("[sms:twilio]", e);
    return { sent: false, provider: "twilio", error: "twilio_error" };
  }
}

/** https://sendpk.com/api/sms.php — common in Pakistan. */
async function sendViaSendPk(phone: string, message: string): Promise<SmsSendResult> {
  const username = process.env.SENDPK_USERNAME;
  const password = process.env.SENDPK_PASSWORD;
  const sender = process.env.SENDPK_SENDER;
  if (!username || !password || !sender) return { sent: false };

  try {
    const url = new URL("https://sendpk.com/api/sms.php");
    url.searchParams.set("username", username);
    url.searchParams.set("password", password);
    url.searchParams.set("sender", sender);
    url.searchParams.set("mobile", phone);
    url.searchParams.set("message", message);

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(20_000) });
    const text = (await res.text()).trim().toLowerCase();
    const ok =
      res.ok &&
      (text.includes("ok") ||
        text.includes("success") ||
        text.includes("sent") ||
        text.startsWith("id:"));
    if (!ok) {
      console.error("[sms:sendpk]", text.slice(0, 200));
      return { sent: false, provider: "sendpk", error: "sendpk_failed" };
    }
    return { sent: true, provider: "sendpk" };
  } catch (e) {
    console.error("[sms:sendpk]", e);
    return { sent: false, provider: "sendpk", error: "sendpk_error" };
  }
}

/** https://corporate.robosms.pk/api/send-message (GET). */
async function sendViaRoboSms(phone: string, message: string): Promise<SmsSendResult> {
  const apiKey = process.env.ROBO_SMS_API_KEY;
  if (!apiKey) return { sent: false };

  const base =
    process.env.ROBO_SMS_API_URL?.replace(/\/$/, "") ??
    "https://corporate.robosms.pk/api/send-message";

  try {
    const url = new URL(base);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("to", phone);
    url.searchParams.set("message", message);
    const mask = process.env.ROBO_SMS_MASK;
    if (mask) url.searchParams.set("from", mask);
    const email = process.env.ROBO_SMS_EMAIL;
    const key = process.env.ROBO_SMS_KEY;
    if (email && key) {
      url.searchParams.set("email", email);
      url.searchParams.set("key", key);
      if (mask) url.searchParams.set("mask", mask);
    }

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(20_000) });
    const text = (await res.text()).trim();
    const lower = text.toLowerCase();
    const ok =
      res.ok &&
      (lower.includes("success") ||
        lower.includes("sent") ||
        lower.includes('"status":true') ||
        lower.includes('"status":"success"'));
    if (!ok) {
      console.error("[sms:robosms]", text.slice(0, 200));
      return { sent: false, provider: "robosms", error: "robosms_failed" };
    }
    return { sent: true, provider: "robosms" };
  } catch (e) {
    console.error("[sms:robosms]", e);
    return { sent: false, provider: "robosms", error: "robosms_error" };
  }
}

/** Custom HTTP gateway: SMS_GATEWAY_URL with {phone} and {message} placeholders. */
async function sendViaHttpGateway(phone: string, message: string): Promise<SmsSendResult> {
  const template = process.env.SMS_GATEWAY_URL;
  if (!template) return { sent: false };

  const urlStr = template
    .replace(/\{phone\}/g, encodeURIComponent(phone))
    .replace(/\{message\}/g, encodeURIComponent(message))
    .replace(/\{otp\}/g, encodeURIComponent(message.match(/\d{4}/)?.[0] ?? ""));

  const method = (process.env.SMS_GATEWAY_METHOD ?? "GET").toUpperCase();
  try {
    const init: RequestInit = { method, signal: AbortSignal.timeout(20_000) };
    if (method === "POST") {
      const bodyTemplate = process.env.SMS_GATEWAY_BODY;
      if (bodyTemplate) {
        init.headers = { "Content-Type": "application/x-www-form-urlencoded" };
        init.body = bodyTemplate
          .replace(/\{phone\}/g, phone)
          .replace(/\{message\}/g, message)
          .replace(/\{otp\}/g, message.match(/\d{4}/)?.[0] ?? "");
      }
    }
    const res = await fetch(urlStr, init);
    const ok = res.ok;
    if (!ok) {
      const err = await res.text().catch(() => "");
      console.error("[sms:gateway]", res.status, err.slice(0, 200));
      return { sent: false, provider: "gateway", error: "gateway_failed" };
    }
    return { sent: true, provider: "gateway" };
  } catch (e) {
    console.error("[sms:gateway]", e);
    return { sent: false, provider: "gateway", error: "gateway_error" };
  }
}

function smsProviderConfigured(): boolean {
  return Boolean(
    (process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER) ||
      (process.env.SENDPK_USERNAME &&
        process.env.SENDPK_PASSWORD &&
        process.env.SENDPK_SENDER) ||
      process.env.ROBO_SMS_API_KEY ||
      process.env.SMS_GATEWAY_URL
  );
}

/** Send OTP SMS via first configured provider (Twilio → SendPK → Robo SMS → custom URL). */
export async function sendPhoneOtpSms(phone: string, otp: string): Promise<SmsSendResult> {
  const pkPhone = normalizePkPhone(phone);
  const message = otpMessage(otp);

  const providers: Array<(p: string, m: string) => Promise<SmsSendResult>> = [];
  if (process.env.TWILIO_ACCOUNT_SID) providers.push(sendViaTwilio);
  if (process.env.SENDPK_USERNAME) providers.push(sendViaSendPk);
  if (process.env.ROBO_SMS_API_KEY || process.env.ROBO_SMS_EMAIL) providers.push(sendViaRoboSms);
  if (process.env.SMS_GATEWAY_URL) providers.push(sendViaHttpGateway);

  if (providers.length === 0) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[sms] No provider configured. OTP for ${pkPhone}: ${otp}`);
    }
    return { sent: false, error: "no_provider" };
  }

  for (const send of providers) {
    const result = await send(pkPhone, message);
    if (result.sent) return result;
  }

  return { sent: false, error: "all_providers_failed" };
}

export function isSmsConfigured(): boolean {
  return smsProviderConfigured();
}
