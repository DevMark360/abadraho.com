import type { FloorPlanReading } from "@/lib/floor-plan-rooms";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "qwen/qwen3.8-27b";
/** Groq rejects base64 images over 4 MB; base64 adds a third. */
const MAX_RAW_IMAGE_BYTES = 3_000_000;
const MAX_IMAGE_SIDE = 2000;
/** Free tier allows 1,000 output tokens per minute; a busy plan needs ~500. */
const MAX_OUTPUT_TOKENS = 900;
const MAX_ROOMS = 60;
const TIMEOUT_MS = 45_000;

const PROMPT = [
  "You read architectural floor plans.",
  "List every labelled room or space that has a printed size.",
  "For each, give the label exactly as printed and its size exactly as printed, for example 11'-6\"X14'-6\".",
  "List repeated rooms separately: three BATH labels are three entries.",
  "Skip labels without a size, furniture, stairs, titles and logos. Never invent rooms or sizes.",
  'Reply with JSON only: {"rooms":[{"name":"BED","size":"14\'X11\'"}]}',
].join(" ");

export class FloorPlanReadError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/** Downscale and flatten to JPEG so large uploads fit Groq's limit and read faster. */
async function prepareImage(data: Buffer, mime: string): Promise<{ data: Buffer; mime: string }> {
  try {
    const sharp = (await import("sharp")).default;
    const jpeg = await sharp(data)
      .rotate()
      .resize({ width: MAX_IMAGE_SIDE, height: MAX_IMAGE_SIDE, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 85 })
      .toBuffer();
    return { data: jpeg, mime: "image/jpeg" };
  } catch {
    if (data.length > MAX_RAW_IMAGE_BYTES) {
      throw new FloorPlanReadError("The floor plan image is too large to read. Use one under 3 MB.", 413);
    }
    return { data, mime };
  }
}

function errorForStatus(status: number, detail: string, retryAfter: string | null): FloorPlanReadError {
  if (status === 401) return new FloorPlanReadError("The Groq API key was rejected. Check GROQ_API_KEY.", 502);
  if (status === 403 || status === 404) {
    return new FloorPlanReadError(
      "The Groq vision model is not available on this account. Enable it in the Groq console.",
      502
    );
  }
  if (status === 429) {
    const seconds = Math.ceil(Number(retryAfter));
    const wait = seconds > 0 && seconds < 600 ? `about ${seconds} seconds` : "a minute";
    return new FloorPlanReadError(`Groq's per-minute limit was reached. Wait ${wait} and try again.`, 429);
  }
  console.error("[floor-plan-reader] Groq error", status, detail.slice(0, 500));
  return new FloorPlanReadError("The floor plan reader is unavailable right now. Try again shortly.", 502);
}

function parseReadings(content: string): FloorPlanReading[] {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object");
  const parsed = JSON.parse(content.slice(start, end + 1)) as { rooms?: unknown };
  if (!Array.isArray(parsed.rooms)) throw new Error("rooms is not an array");

  const readings: FloorPlanReading[] = [];
  for (const item of parsed.rooms.slice(0, MAX_ROOMS)) {
    if (!item || typeof item !== "object") continue;
    const room = item as Record<string, unknown>;
    const label = typeof room.name === "string" ? room.name.trim() : "";
    if (!label) continue;
    const parts = [room.width, room.length].filter((v): v is string => typeof v === "string" && !!v);
    const size =
      typeof room.size === "string" && room.size.trim()
        ? room.size.trim()
        : parts.length === 2
          ? parts.join(" x ")
          : parts[0] ?? null;
    readings.push({ label, size });
  }
  return readings;
}

export async function readFloorPlanRooms(image: Buffer, mime: string): Promise<FloorPlanReading[]> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new FloorPlanReadError("Floor plan reading is not set up. Add GROQ_API_KEY to the server .env.", 503);
  }
  const model = process.env.GROQ_VISION_MODEL?.trim() || DEFAULT_MODEL;
  const prepared = await prepareImage(image, mime);

  let res: Response;
  try {
    res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: MAX_OUTPUT_TOKENS,
        ...(model.startsWith("qwen/") ? { reasoning_effort: "none" } : {}),
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              {
                type: "image_url",
                image_url: { url: `data:${prepared.mime};base64,${prepared.data.toString("base64")}` },
              },
            ],
          },
        ],
      }),
    });
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    throw new FloorPlanReadError(
      timedOut ? "Reading the floor plan took too long. Try again." : "Could not reach Groq. Try again.",
      504
    );
  }

  if (!res.ok) {
    throw errorForStatus(res.status, await res.text().catch(() => ""), res.headers.get("retry-after"));
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  try {
    return parseReadings(json.choices?.[0]?.message?.content ?? "");
  } catch (e) {
    console.error("[floor-plan-reader] unreadable reply", e);
    throw new FloorPlanReadError("Couldn't make out the rooms on this floor plan. Add them by hand.", 422);
  }
}
