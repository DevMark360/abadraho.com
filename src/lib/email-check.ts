/**
 * Email format check + typo suggestions for common providers, shared by forms (live) and APIs.
 * Format only: it can't prove the mailbox exists (verification emails do that).
 */
const EMAIL_RE =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

const POPULAR_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "aol.com",
  "msn.com",
  "proton.me",
  "protonmail.com",
  "ymail.com",
  "yahoo.co.uk",
  "hotmail.co.uk",
  // Real providers that are 1-2 letters from the ones above: never "correct" these.
  "mail.com",
  "gmx.com",
  "gmx.net",
  "zoho.com",
  "yandex.com",
  "hey.com",
  "me.com",
  "mac.com",
];

export type EmailCheck =
  | { ok: true; email: string; suggestion?: string }
  | { ok: false; message: string; suggestion?: string };

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

/** "ali@gmai.com" → "ali@gmail.com" (1-2 typos away from a popular provider). */
export function suggestEmail(email: string): string | undefined {
  const at = email.lastIndexOf("@");
  if (at < 1) return undefined;
  const domain = email.slice(at + 1).toLowerCase();
  if (!domain || POPULAR_DOMAINS.includes(domain)) return undefined;
  let best: { d: string; dist: number } | null = null;
  for (const d of POPULAR_DOMAINS) {
    const dist = editDistance(domain, d);
    if (dist > 0 && dist <= 2 && (!best || dist < best.dist)) best = { d, dist };
  }
  return best ? `${email.slice(0, at)}@${best.d}` : undefined;
}

export function checkEmail(value: string): EmailCheck {
  const email = value.trim();
  if (!email) return { ok: false, message: "Email is required." };
  if (email.length > 254 || !EMAIL_RE.test(email) || email.includes("..")) {
    return { ok: false, message: "Enter a valid email, like name@gmail.com.", suggestion: suggestEmail(email) };
  }
  const suggestion = suggestEmail(email);
  return { ok: true, email, ...(suggestion ? { suggestion } : {}) };
}
