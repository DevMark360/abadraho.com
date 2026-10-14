const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Enabled on the account and handles both text and images. */
export const GROQ_DEFAULT_MODEL = "qwen/qwen3.8-27b";

/** Key for the floor plan reader (and the default for any caller that doesn't pick one). */
export const GROQ_KEY_ENV = "GROQ_API_KEY";
/** Separate key for the Compare page (location / developer verdicts and the unit analysis). */
export const GROQ_COMPARE_KEY_ENV = "GROQ_COMPARE_API_KEY";

export type GroqErrorCode =
  | "not_configured"
  | "auth"
  | "model"
  | "rate_limit"
  | "timeout"
  | "network"
  /** The model's reply failed Groq's JSON check (json mode); a retry usually works. */
  | "bad_output"
  | "upstream";

export class GroqError extends Error {
  constructor(
    message: string,
    readonly code: GroqErrorCode,
    /** HTTP status to hand back to our own caller. */
    readonly status: number,
    /** For rate_limit: seconds until Groq accepts requests again, when known. */
    readonly retryAfterSec?: number
  ) {
    super(message);
  }
}

export type GroqContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

/** Seconds to wait from a 429's Retry-After header, kept within a sensible range. */
function retrySeconds(retryAfter: string | null): number {
  const seconds = Math.ceil(Number(retryAfter));
  return seconds > 0 && seconds < 600 ? seconds : 30;
}

function errorForStatus(status: number, detail: string, retryAfter: string | null, keyEnv: string): GroqError {
  if (status === 401) return new GroqError(`The Groq API key was rejected. Check ${keyEnv}.`, "auth", 502);
  if (status === 403 || status === 404) {
    return new GroqError(
      "The Groq model is not available on this account. Enable it in the Groq console.",
      "model",
      502
    );
  }
  if (status === 429) {
    const seconds = retrySeconds(retryAfter);
    return new GroqError(
      `Groq's per-minute limit was reached. Wait about ${seconds} seconds and try again.`,
      "rate_limit",
      429,
      seconds
    );
  }
  if (status === 400 && /json_validate_failed|failed to generate json/i.test(detail)) {
    return new GroqError("The model's reply was not valid JSON.", "bad_output", 502);
  }
  console.error("[groq] error", status, detail.slice(0, 500));
  return new GroqError("Groq is unavailable right now. Try again shortly.", "upstream", 502);
}

type GroqChatOptions = {
  content: string | GroqContentPart[];
  /** Optional system message sent before the user content. */
  system?: string;
  model?: string;
  maxTokens: number;
  timeoutMs: number;
  /** Ask Groq to guarantee a JSON object reply. */
  json?: boolean;
  /** Name of the env variable holding the API key; defaults to GROQ_API_KEY. */
  apiKeyEnv?: string;
  /** 0 by default; a little higher gives more natural prose. */
  temperature?: number;
};

/** Models Groq refused, per key (each key can be a different account); skipped until restart. */
const unavailableModels = new Set<string>();

/**
 * After a 429, calls with the same key and model wait out Retry-After here instead of hitting
 * Groq again (on the free tier every refused call still counts against the minute).
 */
const coolingUntil = new Map<string, number>();

/**
 * Like groqChat, but when `model` is not available on the account it retries once with
 * GROQ_DEFAULT_MODEL, so a model setting Groq hasn't enabled never breaks the feature.
 */
export async function groqChatWithFallback(options: GroqChatOptions): Promise<{ content: string; model: string }> {
  const requested = options.model?.trim() || GROQ_DEFAULT_MODEL;
  const keyEnv = options.apiKeyEnv ?? GROQ_KEY_ENV;
  const wanted = unavailableModels.has(`${keyEnv}|${requested}`) ? GROQ_DEFAULT_MODEL : requested;
  try {
    return { content: await groqChat({ ...options, model: wanted }), model: wanted };
  } catch (e) {
    if (!(e instanceof GroqError) || e.code !== "model" || wanted === GROQ_DEFAULT_MODEL) throw e;
    unavailableModels.add(`${keyEnv}|${wanted}`);
    console.warn(`[groq] model "${wanted}" is not available; using ${GROQ_DEFAULT_MODEL} until restart`);
    return { content: await groqChat({ ...options, model: GROQ_DEFAULT_MODEL }), model: GROQ_DEFAULT_MODEL };
  }
}

/** One chat completion; returns the reply text. Throws GroqError with a message safe to show admins. */
export async function groqChat(options: GroqChatOptions): Promise<string> {
  const keyEnv = options.apiKeyEnv ?? GROQ_KEY_ENV;
  const apiKey = process.env[keyEnv]?.trim();
  if (!apiKey) {
    throw new GroqError(`Groq is not set up. Add ${keyEnv} to the server .env.`, "not_configured", 503);
  }
  const model = options.model?.trim() || GROQ_DEFAULT_MODEL;
  const coolKey = `${keyEnv}|${model}`;
  const waitMs = (coolingUntil.get(coolKey) ?? 0) - Date.now();
  if (waitMs > 0) {
    const seconds = Math.ceil(waitMs / 1000);
    throw new GroqError(
      `Groq's per-minute limit was reached. Wait about ${seconds} seconds and try again.`,
      "rate_limit",
      429,
      seconds
    );
  }

  let res: Response;
  try {
    res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(options.timeoutMs),
      body: JSON.stringify({
        model,
        temperature: options.temperature ?? 0,
        max_tokens: options.maxTokens,
        // Qwen thinks out loud by default, which burns the free per-minute token budget.
        ...(model.startsWith("qwen/") ? { reasoning_effort: "none" } : {}),
        ...(options.json ? { response_format: { type: "json_object" } } : {}),
        messages: [
          ...(options.system ? [{ role: "system", content: options.system }] : []),
          { role: "user", content: options.content },
        ],
      }),
    });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    throw timedOut
      ? new GroqError("Groq took too long to answer. Try again.", "timeout", 504)
      : new GroqError("Could not reach Groq. Try again.", "network", 504);
  }

  if (!res.ok) {
    const error = errorForStatus(res.status, await res.text().catch(() => ""), res.headers.get("retry-after"), keyEnv);
    if (error.retryAfterSec) coolingUntil.set(coolKey, Date.now() + error.retryAfterSec * 1000);
    throw error;
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

/** The first {...} block in a model reply, parsed. Throws when there is none. */
export function parseJsonObject(content: string): Record<string, unknown> {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object");
  const parsed: unknown = JSON.parse(content.slice(start, end + 1));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not a JSON object");
  return parsed as Record<string, unknown>;
}
