const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Enabled on the account and handles both text and images. */
export const GROQ_DEFAULT_MODEL = "qwen/qwen3.8-27b";

export type GroqErrorCode = "not_configured" | "auth" | "model" | "rate_limit" | "timeout" | "network" | "upstream";

export class GroqError extends Error {
  constructor(
    message: string,
    readonly code: GroqErrorCode,
    /** HTTP status to hand back to our own caller. */
    readonly status: number
  ) {
    super(message);
  }
}

export type GroqContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

function errorForStatus(status: number, detail: string, retryAfter: string | null): GroqError {
  if (status === 401) return new GroqError("The Groq API key was rejected. Check GROQ_API_KEY.", "auth", 502);
  if (status === 403 || status === 404) {
    return new GroqError(
      "The Groq model is not available on this account. Enable it in the Groq console.",
      "model",
      502
    );
  }
  if (status === 429) {
    const seconds = Math.ceil(Number(retryAfter));
    const wait = seconds > 0 && seconds < 600 ? `about ${seconds} seconds` : "a minute";
    return new GroqError(`Groq's per-minute limit was reached. Wait ${wait} and try again.`, "rate_limit", 429);
  }
  console.error("[groq] error", status, detail.slice(0, 500));
  return new GroqError("Groq is unavailable right now. Try again shortly.", "upstream", 502);
}

/** One chat completion; returns the reply text. Throws GroqError with a message safe to show admins. */
export async function groqChat(options: {
  content: string | GroqContentPart[];
  model?: string;
  maxTokens: number;
  timeoutMs: number;
}): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new GroqError("Groq is not set up. Add GROQ_API_KEY to the server .env.", "not_configured", 503);
  }
  const model = options.model?.trim() || GROQ_DEFAULT_MODEL;

  let res: Response;
  try {
    res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(options.timeoutMs),
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: options.maxTokens,
        // Qwen thinks out loud by default, which burns the free per-minute token budget.
        ...(model.startsWith("qwen/") ? { reasoning_effort: "none" } : {}),
        messages: [{ role: "user", content: options.content }],
      }),
    });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    throw timedOut
      ? new GroqError("Groq took too long to answer. Try again.", "timeout", 504)
      : new GroqError("Could not reach Groq. Try again.", "network", 504);
  }

  if (!res.ok) {
    throw errorForStatus(res.status, await res.text().catch(() => ""), res.headers.get("retry-after"));
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
