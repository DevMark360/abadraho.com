import nodemailer from "nodemailer";
import { siteConfig } from "@/config/site";
import { sanitizeReplyToEmail } from "@/lib/contact-form";

function smtpConfig() {
  const host = process.env.SMTP_HOST ?? process.env.MAIL_HOST;
  if (!host) return null;

  const port = Number(process.env.SMTP_PORT ?? process.env.MAIL_PORT ?? 587);
  const encryption = (process.env.SMTP_ENCRYPTION ?? process.env.MAIL_ENCRYPTION ?? "tls")
    .toLowerCase()
    .replace(/"/g, "");

  const rejectUnauthorized =
    process.env.MAIL_TLS_REJECT_UNAUTHORIZED !== "false" &&
    process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false";

  return {
    host,
    port,
    secure: encryption === "ssl" || port === 465,
    auth: {
      user: process.env.SMTP_USER ?? process.env.MAIL_USERNAME,
      pass: process.env.SMTP_PASSWORD ?? process.env.MAIL_PASSWORD,
    },
    tls: { rejectUnauthorized },
    // Nodemailer defaults (2min connect / 10min socket) let a slow/unreachable
    // SMTP host hang the request handler that awaits sendMail. Fail fast instead.
    connectionTimeout: 8_000,
    greetingTimeout: 5_000,
    socketTimeout: 10_000,
  };
}

let cachedTransport: ReturnType<typeof nodemailer.createTransport> | null = null;
let cachedTransportKey: string | null = null;

/** Reuse one transport per process instead of opening a fresh one on every send. */
function getTransport(cfg: NonNullable<ReturnType<typeof smtpConfig>>) {
  const key = `${cfg.host}:${cfg.port}:${cfg.auth.user}`;
  if (!cachedTransport || cachedTransportKey !== key) {
    cachedTransport = nodemailer.createTransport(cfg);
    cachedTransportKey = key;
  }
  return cachedTransport;
}

export async function sendAuthEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ sent: boolean; previewUrl?: string }> {
  const cfg = smtpConfig();
  if (!cfg?.auth.user || !cfg.auth.pass) {
    console.error("[mail] SMTP not configured — set MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD");
    if (process.env.NODE_ENV !== "production") {
      console.info("[mail:dev]", opts.subject, "→", opts.to, opts.text ?? opts.html.slice(0, 200));
    }
    return { sent: false, previewUrl: opts.html.match(/href="([^"]+)"/)?.[1] };
  }

  try {
    const transport = getTransport(cfg);
    const from =
      process.env.MAIL_FROM_ADDRESS ??
      process.env.SMTP_FROM ??
      cfg.auth.user;
    const fromName = process.env.MAIL_FROM_NAME ?? siteConfig.name;

    await transport.sendMail({
      from: `"${fromName}" <${from}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return { sent: true };
  } catch (e) {
    console.error("[mail]", e);
    if (process.env.NODE_ENV !== "production") {
      return { sent: false, previewUrl: opts.html.match(/href="([^"]+)"/)?.[1] };
    }
    return { sent: false };
  }
}

export function passwordResetEmailHtml(resetUrl: string): string {
  return `<p>Reset your ${siteConfig.name} password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`;
}

const DEFAULT_CONTACT_NOTIFY_TO = "info@abadraho.com";

export function contactNotifyAddress(): string {
  return process.env.CONTACT_NOTIFY_EMAIL ?? DEFAULT_CONTACT_NOTIFY_TO;
}

export function contactInquiryEmailHtml(data: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;color:#111">
      <h2 style="margin:0 0 16px;font-size:18px">Contact form inquiry</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#71717a;width:100px">Name</td><td>${esc(data.name)}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a">Email</td><td><a href="mailto:${esc(data.email)}">${esc(data.email)}</a></td></tr>
        <tr><td style="padding:6px 0;color:#71717a">Phone</td><td>${esc(data.phone)}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a">Subject</td><td>${esc(data.subject)}</td></tr>
      </table>
      <p style="margin:16px 0 8px;font-weight:600">Message</p>
      <p style="margin:0;white-space:pre-wrap;line-height:1.5">${esc(data.message)}</p>
    </div>`;
}

export async function sendContactInquiryEmail(data: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}): Promise<{ sent: boolean }> {
  const to = contactNotifyAddress();
  const html = contactInquiryEmailHtml(data);
  const text = [
    "Contact form inquiry",
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    `Subject: ${data.subject}`,
    "",
    data.message,
  ].join("\n");

  const cfg = smtpConfig();
  if (!cfg?.auth.user || !cfg.auth.pass) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[mail:contact:dev]", "Contact Form Inquiry →", to, text);
    }
    return { sent: false };
  }

  try {
    const transport = getTransport(cfg);
    const from =
      process.env.CONTACT_MAIL_FROM ??
      process.env.MAIL_FROM_ADDRESS ??
      process.env.SMTP_FROM ??
      cfg.auth.user;
    const fromName = process.env.MAIL_FROM_NAME ?? siteConfig.name;

    const replyTo = sanitizeReplyToEmail(data.email);
    await transport.sendMail({
      from: `"${fromName}" <${from}>`,
      to,
      ...(replyTo ? { replyTo } : {}),
      subject: "Contact Form Inquiry",
      html,
      text,
    });
    return { sent: true };
  } catch (e) {
    console.error("[mail:contact]", e);
    return { sent: false };
  }
}

const DEFAULT_ENQUIRY_ADDRESS = "enquiry@abadraho.com";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function enquiryFromAddress(): string {
  return process.env.ENQUIRY_MAIL_FROM ?? DEFAULT_ENQUIRY_ADDRESS;
}

function enquiryCcAddress(): string {
  return process.env.ENQUIRY_CC_EMAIL ?? DEFAULT_ENQUIRY_ADDRESS;
}

export type PropertyInquiryEmailData = {
  name: string;
  email: string;
  address: string;
  phone: string;
  unit: string;
  project: string;
  message: string;
  builderEmail?: string | null;
  builderName?: string | null;
  agentEmail?: string | null;
  agentName?: string | null;
  agentCode?: string | null;
};

export function builderPropertyInquiryEmailHtml(data: {
  name: string;
  unit: string;
  project: string;
}): string {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;color:#111">
      <h2 style="margin:0 0 16px;font-size:18px">New project inquiry</h2>
      <p style="margin:0 0 12px;font-size:14px;color:#52525b">A client submitted an inquiry for your project. Contact details are managed by Abad Raho.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#71717a;width:110px">Client name</td><td>${escapeHtml(data.name)}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a">Project</td><td>${escapeHtml(data.project)}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a">Unit</td><td>${escapeHtml(data.unit)}</td></tr>
      </table>
    </div>`;
}

function builderPropertyInquiryEmailText(data: {
  name: string;
  unit: string;
  project: string;
}): string {
  return [
    "New project inquiry",
    `Client name: ${data.name}`,
    `Project: ${data.project}`,
    `Unit: ${data.unit}`,
  ].join("\n");
}

export function propertyInquiryEmailHtml(data: PropertyInquiryEmailData): string {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;color:#111">
      <h2 style="margin:0 0 16px;font-size:18px">Abad Raho enquiry</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#71717a;width:110px">Name</td><td>${escapeHtml(data.name)}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a">Email</td><td><a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></td></tr>
        <tr><td style="padding:6px 0;color:#71717a">Address</td><td>${escapeHtml(data.address)}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a">Phone</td><td>${escapeHtml(data.phone)}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a">Unit</td><td>${escapeHtml(data.unit)}</td></tr>
        <tr><td style="padding:6px 0;color:#71717a">Project</td><td>${escapeHtml(data.project)}</td></tr>
      </table>
      <p style="margin:16px 0 8px;font-weight:600">Message</p>
      <p style="margin:0;white-space:pre-wrap;line-height:1.5">${escapeHtml(data.message)}</p>
    </div>`;
}

function propertyInquiryEmailText(data: PropertyInquiryEmailData): string {
  return [
    "Abad Raho enquiry",
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Address: ${data.address}`,
    `Phone: ${data.phone}`,
    `Unit: ${data.unit}`,
    `Project: ${data.project}`,
    "",
    data.message,
  ].join("\n");
}

async function sendEnquiryMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  cc?: string;
  replyTo?: string;
}): Promise<{ sent: boolean }> {
  const cfg = smtpConfig();
  if (!cfg?.auth.user || !cfg.auth.pass) {
    if (process.env.NODE_ENV !== "production") {
      const cc = opts.cc ? ` (cc ${opts.cc})` : "";
      console.info("[mail:enquiry:dev]", opts.subject, "→", opts.to + cc, opts.text.slice(0, 200));
    }
    return { sent: false };
  }

  try {
    const transport = getTransport(cfg);
    const from = enquiryFromAddress();
    await transport.sendMail({
      from: `"Abad Raho" <${from}>`,
      to: opts.to,
      cc: opts.cc,
      replyTo: opts.replyTo,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return { sent: true };
  } catch (e) {
    console.error("[mail:enquiry]", e);
    return { sent: false };
  }
}

/** Route inquiry emails: admin + agent (full), builder (name/project/unit only). */
export async function sendPropertyInquiryRoutedEmails(
  data: PropertyInquiryEmailData
): Promise<{ adminSent: boolean; builderSent: boolean; agentSent: boolean; userSent: boolean }> {
  const subject = "Abad Raho Enquiry";
  const fullHtml = propertyInquiryEmailHtml(data);
  const fullText = propertyInquiryEmailText(data);
  const builderHtml = builderPropertyInquiryEmailHtml({
    name: data.name,
    unit: data.unit,
    project: data.project,
  });
  const builderText = builderPropertyInquiryEmailText({
    name: data.name,
    unit: data.unit,
    project: data.project,
  });

  const builderEmail = data.builderEmail?.trim();
  const agentEmail = data.agentEmail?.trim();

  // Independent recipients — send concurrently so one slow/hung SMTP attempt
  // doesn't serialize (and multiply) the wait for the others.
  const [userSent, adminSent, builderSent, agentSent] = await Promise.all([
    data.email
      ? sendEnquiryMail({ to: data.email, subject, html: fullHtml, text: fullText }).then((r) => r.sent)
      : Promise.resolve(false),
    sendEnquiryMail({
      to: enquiryCcAddress(),
      subject: data.agentCode ? `${subject} (via ${data.agentCode})` : subject,
      html: fullHtml,
      text: fullText,
      replyTo: data.email,
    }).then((r) => r.sent),
    builderEmail
      ? sendEnquiryMail({ to: builderEmail, subject: "New project inquiry", html: builderHtml, text: builderText }).then(
          (r) => r.sent
        )
      : Promise.resolve(false),
    agentEmail
      ? sendEnquiryMail({
          to: agentEmail,
          subject: data.agentCode ? `${subject} (${data.agentCode})` : subject,
          html: fullHtml,
          text: fullText,
          replyTo: data.email,
        }).then((r) => r.sent)
      : Promise.resolve(false),
  ]);

  return { adminSent, builderSent, agentSent, userSent };
}

/** Legacy: user confirmation + builder notification (cc enquiry@abadraho.com). */
export async function sendPropertyInquiryEmails(
  data: PropertyInquiryEmailData
): Promise<{ userSent: boolean; builderSent: boolean }> {
  const subject = "Abad Raho Enquiry";
  const html = propertyInquiryEmailHtml(data);
  const text = propertyInquiryEmailText(data);

  const builderEmail = data.builderEmail?.trim();

  const [userSent, builderSent] = await Promise.all([
    data.email
      ? sendEnquiryMail({ to: data.email, subject, html, text }).then((r) => r.sent)
      : Promise.resolve(false),
    builderEmail
      ? sendEnquiryMail({ to: builderEmail, subject, html, text, cc: enquiryCcAddress(), replyTo: data.email }).then(
          (r) => r.sent
        )
      : Promise.resolve(false),
  ]);

  return { userSent, builderSent };
}

export function emailVerifyEmailHtml(verifyUrl: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px">
      <h2 style="margin:0 0 12px">Verify your email</h2>
      <p>Click the button below to verify your ${siteConfig.name} account.</p>
      <p style="margin:24px 0">
        <a href="${verifyUrl}" style="background:#18181b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">
          Verify email
        </a>
      </p>
      <p style="font-size:12px;color:#71717a">Or copy this link:<br/><a href="${verifyUrl}">${verifyUrl}</a></p>
    </div>`;
}
