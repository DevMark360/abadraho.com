import { createHash } from "node:crypto";
import { tableExists } from "@/lib/db-table-exists";
import { isDatabaseEnabled } from "@/lib/db";
import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { GROQ_COMPARE_KEY_ENV, GroqError, groqChatWithFallback, parseJsonObject } from "@/server/groq-client";

export type VerdictKind = "location" | "developer";
export const VERDICT_KINDS: readonly VerdictKind[] = ["location", "developer"];

/** What the buyer wants the unit for; the AI judges location and developer against it. */
export type BuyerPurpose = "living" | "investment";
export const BUYER_PURPOSES: readonly BuyerPurpose[] = ["living", "investment"];

/** Text model for verdicts. Falls back to GROQ_DEFAULT_MODEL when Groq hasn't enabled it. */
const DEFAULT_TEXT_MODEL = "llama-3.1-8b-instant";

/** Stored in the `kind` column, e.g. "location:investment"; one cache entry per purpose. */
const slotFor = (kind: VerdictKind, purpose: BuyerPurpose) => `${kind}:${purpose}`;

function parseSlot(slot: string): { kind: VerdictKind; purpose: BuyerPurpose | null } {
  const [kind, purpose] = slot.split(":");
  return {
    kind: kind === "developer" ? "developer" : "location",
    // Rows saved before purposes existed have none.
    purpose: BUYER_PURPOSES.includes(purpose as BuyerPurpose) ? (purpose as BuyerPurpose) : null,
  };
}

/** Stored winner, relative to the pair's alphabetical order (name_a, name_b). */
export type StoredWinner = "a" | "b" | "tie";
export const STORED_WINNERS: readonly StoredWinner[] = ["a", "b", "tie"];

/** Winner relative to the order the caller passed the two names in. */
export type CompareVerdict = {
  winner: "first" | "second" | "tie";
  reason: string;
  /** same: identical names, no AI call; ai: Groq's answer; manual: corrected by an admin. */
  source: "same" | "ai" | "manual";
};

type StoredVerdict = { nameA: string; nameB: string; winner: StoredWinner; reason: string; manual: boolean };

const TABLE = "compare_ai_verdicts";
const MAX_REASON = 200;
const MAX_NAME = 191;
const MEMORY_TTL_MS = 2 * 60_000;
const MEMORY_MAX = 1000;
const RETRY_AFTER_FAILURE_MS = 60_000;

/** In-process layer over the table: instant repeats, and a fallback before the SQL is applied. */
const memory = new Map<string, { verdict: StoredVerdict; expires: number }>();
const inFlight = new Map<string, Promise<StoredVerdict | null>>();
const failedUntil = new Map<string, number>();
let groqPausedUntil = 0;

const cleanName = (value: string) => value.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
const nameKey = (value: string) => cleanName(value).toLowerCase();

export function verdictPairKey(slot: string, nameA: string, nameB: string): string {
  return createHash("sha1").update(`${slot}|${nameKey(nameA)}|${nameKey(nameB)}`).digest("hex");
}

function remember(key: string, verdict: StoredVerdict) {
  memory.delete(key);
  memory.set(key, { verdict, expires: Date.now() + MEMORY_TTL_MS });
  if (memory.size > MEMORY_MAX) memory.delete(memory.keys().next().value!);
}

export function forgetVerdict(key: string) {
  memory.delete(key);
  failedUntil.delete(key);
}

async function cacheTableReady(): Promise<boolean> {
  if (!isDatabaseEnabled()) return false;
  try {
    return await tableExists(TABLE);
  } catch {
    return false;
  }
}

type VerdictRow = {
  id: number;
  kind: string;
  name_a: string;
  name_b: string;
  winner: string;
  reason: string;
  model: string | null;
  is_manual: number | boolean;
  created_at: Date;
  updated_at: Date;
};

function toStored(row: VerdictRow): StoredVerdict {
  return {
    nameA: row.name_a,
    nameB: row.name_b,
    winner: STORED_WINNERS.includes(row.winner as StoredWinner) ? (row.winner as StoredWinner) : "tie",
    reason: row.reason,
    manual: Boolean(Number(row.is_manual)),
  };
}

async function readStored(slot: string, key: string): Promise<StoredVerdict | null> {
  if (!(await cacheTableReady())) return null;
  const rows = await queryRaw<VerdictRow[]>(
    `SELECT * FROM ${TABLE} WHERE kind = ? AND pair_key = ? LIMIT 1`,
    slot,
    key
  );
  return rows[0] ? toStored(rows[0]) : null;
}

async function saveStored(slot: string, key: string, verdict: StoredVerdict, model: string) {
  if (!(await cacheTableReady())) return;
  // A row written meanwhile (another request, or an admin) wins.
  await executeRaw(
    `INSERT IGNORE INTO ${TABLE} (kind, pair_key, name_a, name_b, winner, reason, model, is_manual)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    slot,
    key,
    verdict.nameA,
    verdict.nameB,
    verdict.winner,
    verdict.reason,
    model
  );
}

const FOCUS: Record<VerdictKind, Record<BuyerPurpose, string>> = {
  location: {
    living:
      "The buyer will live there with family. Judge family infrastructure (schools, hospitals, parks), security, neighbourhood livability and daily convenience (markets, transport, commute).",
    investment:
      "The buyer is investing for capital growth and rental income. Judge expected capital growth, rental demand, commercial footfall and the value of planned or upcoming infrastructure.",
  },
  developer: {
    living:
      "The buyer will live in the unit. Judge on-time delivery, construction quality, finishing, maintenance after handover and buyer trust.",
    investment:
      "The buyer is investing. Judge on-time delivery, how well the developer's past projects held and grew in value, resale and rental appeal of their projects, and buyer trust.",
  },
};

const SYSTEM_PROMPT = [
  "You advise property buyers in Pakistan using well-known general knowledge only.",
  "If you are not reasonably sure about either option, or they are similar for this buyer, answer tie.",
  "The reason is one neutral sentence of at most 15 words that names them, never 'first' or 'second'.",
  'Reply with JSON only: {"winner":"first"|"second"|"tie","reason":"..."}',
].join(" ");

function buildPrompt(kind: VerdictKind, purpose: BuyerPurpose, nameA: string, nameB: string): string {
  const subject =
    kind === "location"
      ? `Which is the better residential location: first "${nameA}" or second "${nameB}"?`
      : `Which is the better property developer (builder): first "${nameA}" or second "${nameB}"?`;
  return `${subject} ${FOCUS[kind][purpose]}`;
}

async function askGroq(
  kind: VerdictKind,
  purpose: BuyerPurpose,
  nameA: string,
  nameB: string
): Promise<{ verdict: StoredVerdict; model: string }> {
  const { content, model } = await groqChatWithFallback({
    model: process.env.GROQ_TEXT_MODEL?.trim() || DEFAULT_TEXT_MODEL,
    apiKeyEnv: GROQ_COMPARE_KEY_ENV,
    system: SYSTEM_PROMPT,
    content: buildPrompt(kind, purpose, nameA, nameB),
    json: true,
    maxTokens: 150,
    timeoutMs: 20_000,
  });
  const parsed = parseJsonObject(content);
  const raw = String(parsed.winner ?? "").trim().toLowerCase();
  const winner: StoredWinner = raw === "first" ? "a" : raw === "second" ? "b" : "tie";
  const reason =
    typeof parsed.reason === "string" && parsed.reason.trim()
      ? parsed.reason.trim().slice(0, MAX_REASON)
      : winner === "tie"
        ? "Too close to call."
        : "";
  if (!reason) throw new Error("reply has no reason");
  return { verdict: { nameA, nameB, winner, reason, manual: false }, model };
}

async function loadOrAsk(
  kind: VerdictKind,
  purpose: BuyerPurpose,
  key: string,
  nameA: string,
  nameB: string
): Promise<StoredVerdict | null> {
  const slot = slotFor(kind, purpose);
  const cached = memory.get(key);
  if (cached && cached.expires > Date.now()) return cached.verdict;

  const stored = await readStored(slot, key).catch((e) => {
    console.error("[compare-verdict] read failed", e);
    return null;
  });
  if (stored) {
    remember(key, stored);
    return stored;
  }

  const now = Date.now();
  if (now < groqPausedUntil || now < (failedUntil.get(key) ?? 0)) return null;

  try {
    const { verdict, model } = await askGroq(kind, purpose, nameA, nameB);
    await saveStored(slot, key, verdict, model).catch((e) => console.error("[compare-verdict] save failed", e));
    // Re-read so a row an admin or another request saved first is what everyone sees.
    const final = (await readStored(slot, key).catch(() => null)) ?? verdict;
    remember(key, final);
    return final;
  } catch (e) {
    failedUntil.set(key, Date.now() + RETRY_AFTER_FAILURE_MS);
    if (e instanceof GroqError) {
      if (e.code === "rate_limit") groqPausedUntil = Date.now() + RETRY_AFTER_FAILURE_MS;
      console.warn("[compare-verdict]", kind, e.code, e.message);
    } else {
      console.error("[compare-verdict] unreadable reply", kind, e);
    }
    return null;
  }
}

/**
 * Which of two areas / developers is better for the buyer's purpose, from Groq's general
 * knowledge (names only). Asked once per pair and purpose, then cached; null when it can't be
 * answered right now.
 */
export async function getCompareVerdict(
  kind: VerdictKind,
  purpose: BuyerPurpose,
  first: string | null | undefined,
  second: string | null | undefined
): Promise<CompareVerdict | null> {
  const a = cleanName(first ?? "");
  const b = cleanName(second ?? "");
  if (!a || !b) return null;
  if (nameKey(a) === nameKey(b)) {
    return { winner: "tie", reason: kind === "location" ? "Same area." : "Same developer.", source: "same" };
  }

  const firstIsA = nameKey(a) < nameKey(b);
  const [nameA, nameB] = firstIsA ? [a, b] : [b, a];
  const key = verdictPairKey(slotFor(kind, purpose), nameA, nameB);

  let pending = inFlight.get(key);
  if (!pending) {
    pending = loadOrAsk(kind, purpose, key, nameA, nameB).finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  const stored = await pending;
  if (!stored) return null;

  const winner =
    stored.winner === "tie" ? "tie" : (stored.winner === "a") === firstIsA ? "first" : "second";
  return { winner, reason: stored.reason, source: stored.manual ? "manual" : "ai" };
}

// ---------------------------------------------------------------------------------------------
// Admin: review and correct cached verdicts.
// ---------------------------------------------------------------------------------------------

export type AdminVerdict = {
  id: number;
  kind: VerdictKind;
  /** null for verdicts saved before buyer purposes existed. */
  purpose: BuyerPurpose | null;
  nameA: string;
  nameB: string;
  winner: StoredWinner;
  reason: string;
  model: string | null;
  manual: boolean;
  updatedAt: string;
};

export class VerdictTableMissingError extends Error {
  constructor() {
    super(
      "The compare_ai_verdicts table is missing. Run prisma/manual-migrations/2026-10-14-compare-ai-verdicts.sql, then restart the app."
    );
  }
}

async function requireTable() {
  if (!(await cacheTableReady())) throw new VerdictTableMissingError();
}

export async function listVerdicts(filters: {
  kind?: VerdictKind;
  purpose?: BuyerPurpose;
  q?: string;
  page: number;
  perPage: number;
}): Promise<{ items: AdminVerdict[]; total: number }> {
  await requireTable();
  const where: string[] = [];
  const params: unknown[] = [];
  if (filters.kind && filters.purpose) {
    where.push("kind = ?");
    params.push(slotFor(filters.kind, filters.purpose));
  } else if (filters.kind) {
    where.push("(kind = ? OR kind LIKE ?)");
    params.push(filters.kind, `${filters.kind}:%`);
  } else if (filters.purpose) {
    where.push("kind LIKE ?");
    params.push(`%:${filters.purpose}`);
  }
  const q = filters.q?.trim();
  if (q) {
    where.push("(name_a LIKE ? OR name_b LIKE ? OR reason LIKE ?)");
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    params.push(like, like, like);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const offset = (filters.page - 1) * filters.perPage;

  const [countRows, rows] = await Promise.all([
    queryRaw<{ total: bigint }[]>(`SELECT COUNT(*) AS total FROM ${TABLE} ${clause}`, ...params),
    queryRaw<VerdictRow[]>(
      `SELECT * FROM ${TABLE} ${clause} ORDER BY updated_at DESC, id DESC LIMIT ? OFFSET ?`,
      ...params,
      filters.perPage,
      offset
    ),
  ]);

  return {
    total: Number(countRows[0]?.total ?? 0),
    items: rows.map((row) => ({
      id: Number(row.id),
      ...parseSlot(row.kind),
      nameA: row.name_a,
      nameB: row.name_b,
      winner: toStored(row).winner,
      reason: row.reason,
      model: row.model,
      manual: Boolean(Number(row.is_manual)),
      updatedAt: new Date(row.updated_at).toISOString(),
    })),
  };
}

async function pairKeyForId(id: number): Promise<string | null> {
  const rows = await queryRaw<{ pair_key: string }[]>(`SELECT pair_key FROM ${TABLE} WHERE id = ? LIMIT 1`, id);
  return rows[0]?.pair_key ?? null;
}

/** Saves an admin correction; it is never overwritten by Groq. */
export async function updateVerdict(id: number, winner: StoredWinner, reason: string): Promise<boolean> {
  await requireTable();
  const key = await pairKeyForId(id);
  if (!key) return false;
  await executeRaw(
    `UPDATE ${TABLE} SET winner = ?, reason = ?, is_manual = 1 WHERE id = ?`,
    winner,
    reason.trim().slice(0, MAX_REASON),
    id
  );
  forgetVerdict(key);
  return true;
}

/** Removes a verdict; the next comparison of that pair asks Groq again. */
export async function deleteVerdict(id: number): Promise<boolean> {
  await requireTable();
  const key = await pairKeyForId(id);
  if (!key) return false;
  await executeRaw(`DELETE FROM ${TABLE} WHERE id = ?`, id);
  forgetVerdict(key);
  return true;
}
