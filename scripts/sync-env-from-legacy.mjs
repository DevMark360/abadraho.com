/**
 * Copy auth/mail/OAuth vars from Laravel dev.abadraho.com .env into abadraho-v2/.env
 * Usage: node scripts/sync-env-from-legacy.mjs [path-to-laravel-.env]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const v2Root = resolve(__dirname, "..");
const legacyEnvPath =
  process.argv[2] ?? resolve(v2Root, "..", "dev.abadraho.com", ".env");

const KEYS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "FACEBOOK_CLIENT_ID",
  "FACEBOOK_CLIENT_SECRET",
  "MAIL_MAILER",
  "MAIL_HOST",
  "MAIL_PORT",
  "MAIL_USERNAME",
  "MAIL_PASSWORD",
  "MAIL_ENCRYPTION",
  "MAIL_FROM_ADDRESS",
  "MAIL_FROM_NAME",
  "MAPBOX_ACCESS_TOKEN",
];

function parseEnv(content) {
  const out = {};
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function upsertEnvLine(lines, key, value) {
  const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
  const row = `${key}=${value.includes(" ") || value.includes(",") ? `"${value}"` : value}`;
  if (idx >= 0) lines[idx] = row;
  else lines.push(row);
}

if (!existsSync(legacyEnvPath)) {
  console.error(`Legacy .env not found: ${legacyEnvPath}`);
  process.exit(1);
}

const legacy = parseEnv(readFileSync(legacyEnvPath, "utf8"));
const v2EnvPath = resolve(v2Root, ".env");
const lines = existsSync(v2EnvPath) ? readFileSync(v2EnvPath, "utf8").split("\n") : [];

for (const key of KEYS) {
  if (legacy[key]) upsertEnvLine(lines, key, legacy[key]);
}

// Laravel-compatible OAuth callback paths (registered on Google/Facebook for dev.abadraho.com)
upsertEnvLine(lines, "OAUTH_GOOGLE_CALLBACK_PATH", "/auth/google/call-back");
upsertEnvLine(lines, "OAUTH_FACEBOOK_CALLBACK_PATH", "/auth/facebook/call-back");

if (!lines.some((l) => l.startsWith("MAIL_FROM_ADDRESS=")) && legacy.MAIL_USERNAME) {
  upsertEnvLine(lines, "MAIL_FROM_ADDRESS", legacy.MAIL_USERNAME);
}
if (!lines.some((l) => l.startsWith("MAIL_FROM_NAME="))) {
  upsertEnvLine(lines, "MAIL_FROM_NAME", "AbadRaho");
}

writeFileSync(v2EnvPath, lines.filter((l, i, a) => l.length || i < a.length - 1).join("\n") + "\n");
console.log(`Synced ${KEYS.filter((k) => legacy[k]).length} keys from ${legacyEnvPath}`);
console.log(`→ ${v2EnvPath}`);
console.log("\nOAuth: add these Authorized redirect URIs if using localhost:");
console.log("  http://localhost:3000/auth/google/call-back");
console.log("  http://localhost:3000/auth/facebook/call-back");
