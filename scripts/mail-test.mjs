/**
 * Check that the site can send email, using the same settings as src/lib/mail.ts.
 * Run on the server from the app folder:
 *
 *   node scripts/mail-test.mjs you@example.com
 *
 * Prints the SMTP settings (never the password), checks login with the mail server, then sends
 * a test message. If it fails, the error says why (wrong password, port blocked, sender refused…).
 */
import "dotenv/config";
import nodemailer from "nodemailer";

const to = process.argv[2];
if (!to || !to.includes("@")) {
  console.error("Usage: node scripts/mail-test.mjs you@example.com");
  process.exit(1);
}

const env = process.env;
const host = env.SMTP_HOST ?? env.MAIL_HOST;
const port = Number(env.SMTP_PORT ?? env.MAIL_PORT ?? 587);
const encryption = (env.SMTP_ENCRYPTION ?? env.MAIL_ENCRYPTION ?? "tls").toLowerCase().replace(/"/g, "");
const user = env.SMTP_USER ?? env.MAIL_USERNAME;
const pass = env.SMTP_PASSWORD ?? env.MAIL_PASSWORD;
const from = env.MAIL_FROM_ADDRESS ?? env.SMTP_FROM ?? user;
const fromName = env.MAIL_FROM_NAME ?? env.NEXT_PUBLIC_APP_NAME ?? "AbadRaho";

console.log("SMTP settings");
console.log("  host       :", host ?? "(missing: set MAIL_HOST)");
console.log("  port       :", port, `(${encryption === "ssl" || port === 465 ? "SSL" : "STARTTLS"})`);
console.log("  username   :", user ?? "(missing: set MAIL_USERNAME)");
console.log("  password   :", pass ? `set (${pass.length} characters)` : "(missing: set MAIL_PASSWORD)");
console.log("  from       :", `"${fromName}" <${from}>`);
if (from && user && from.split("@")[1]?.toLowerCase() !== user.split("@")[1]?.toLowerCase()) {
  console.log("  WARNING    : the from address is on a different domain than the username; Gmail/Outlook often reject or spam that.");
}
if (!host || !user || !pass) process.exit(1);

const transport = nodemailer.createTransport({
  host,
  port,
  secure: encryption === "ssl" || port === 465,
  auth: { user, pass },
  tls: { rejectUnauthorized: env.MAIL_TLS_REJECT_UNAUTHORIZED !== "false" && env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false" },
  connectionTimeout: 8_000,
  greetingTimeout: 5_000,
  socketTimeout: 10_000,
});

try {
  await transport.verify();
  console.log("\nLogin to the mail server: OK");
} catch (e) {
  console.error("\nLogin to the mail server FAILED:", e.message);
  process.exit(1);
}

try {
  const info = await transport.sendMail({
    from: `"${fromName}" <${from}>`,
    to,
    subject: `${fromName} mail test`,
    text: "If you can read this, the website can send email (password resets, verification).",
  });
  console.log("Test email accepted by the server:", info.response);
  console.log("Accepted:", info.accepted.join(", ") || "(none)", "| Rejected:", info.rejected.join(", ") || "(none)");
  console.log("\nCheck the inbox and the Spam folder of", to);
} catch (e) {
  console.error("Sending FAILED:", e.message);
  process.exit(1);
}
