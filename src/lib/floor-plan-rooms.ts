export type FeetInches = { feet: number; inches: number };

/** A room as read off the floor plan image: label and size exactly as printed. */
export type FloorPlanReading = { label: string; size: string | null };

export type RoomSuggestion = {
  label: string;
  roomTypeId: number | null;
  width: FeetInches | null;
  length: FeetInches | null;
  qty: number;
};

type RoomTypeOption = { id: number; name: string };

const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Spellings seen on floor plans, grouped with the room type names they mean. */
const SYNONYMS: string[][] = [
  ["bed", "bedroom", "masterbed", "masterbedroom", "guestroom", "guestbed", "childbed", "kidsroom", "br"],
  ["bath", "bathroom", "toilet", "washroom", "attachedbath", "attbath"],
  ["lounge", "tvlounge", "livingroom", "living", "familylounge", "familyroom"],
  ["drawing", "drawingroom"],
  ["kitchen", "kit", "kitch"],
  ["dinning", "dining", "diningroom", "dinningroom"],
  ["balcony", "balc"],
  ["terrace", "roofterrace", "openterrace"],
  ["entlobby", "entrancelobby", "entrance"],
  ["store", "storeroom", "storage"],
  ["parking", "carparking", "garage"],
  ["carporch", "porch"],
  ["servent", "servant", "servantroom", "servantquarter"],
  ["study", "studyroom"],
  ["powder", "powderroom"],
  ["openwashingarea", "openandwashingarea", "washingarea", "washarea", "laundry"],
  ["lawn", "garden"],
];

const SYNONYM_GROUP = new Map(SYNONYMS.flatMap((group) => group.map((word) => [word, group])));

export function matchRoomType(label: string, roomTypes: RoomTypeOption[]): number | null {
  const byKey = new Map(roomTypes.map((rt) => [key(rt.name), rt.id]));
  const raw = key(label);
  const bare = raw.replace(/\d+$/, "");

  for (const candidate of [raw, bare]) {
    const exact = byKey.get(candidate);
    if (exact) return exact;
    const group = SYNONYM_GROUP.get(candidate);
    const viaSynonym = group?.map((word) => byKey.get(word)).find(Boolean);
    if (viaSynonym) return viaSynonym;
  }

  let best: { id: number; length: number } | null = null;
  for (const [name, id] of byKey) {
    if (name.length >= 3 && bare.startsWith(name) && (!best || name.length > best.length)) {
      best = { id, length: name.length };
    }
  }
  return best?.id ?? null;
}

function normalizeMarks(value: string): string {
  return value
    .replace(/[’′‘´`]/g, "'")
    .replace(/[”″“]|''/g, '"')
    .replace(/\s*(feet|foot|ft)\.?/gi, "'")
    .replace(/\s*(inches|inch|in)\.?/gi, '"')
    .trim();
}

function toFeetInches(totalInches: number): FeetInches {
  const rounded = Math.round(totalInches);
  return { feet: Math.floor(rounded / 12), inches: rounded % 12 };
}

/** "11'-6\"", "11' 6", "11.5", "8'", "6\"" → feet + inches. */
export function parseLength(raw: string): FeetInches | null {
  const text = normalizeMarks(raw);
  const feetInches = text.match(/^(\d+(?:\.\d+)?)\s*'\s*-?\s*(?:(\d+(?:\.\d+)?)\s*"?)?$/);
  if (feetInches) {
    return toFeetInches(Number(feetInches[1]) * 12 + Number(feetInches[2] ?? 0));
  }
  const inchesOnly = text.match(/^(\d+(?:\.\d+)?)\s*"$/);
  if (inchesOnly) return toFeetInches(Number(inchesOnly[1]));
  const plain = text.match(/^(\d+(?:\.\d+)?)$/);
  if (plain) return toFeetInches(Number(plain[1]) * 12);
  return null;
}

/** "11'-6\"X14'-6\"" → width 11'6", length 14'6". */
export function parseDimensions(raw: string): { width: FeetInches; length: FeetInches } | null {
  const parts = normalizeMarks(raw).split(/\s*[x×✕*]\s*/i);
  if (parts.length !== 2) return null;
  const width = parseLength(parts[0]);
  const length = parseLength(parts[1]);
  return width && length && (width.feet || width.inches) && (length.feet || length.inches)
    ? { width, length }
    : null;
}

/** Matches labels to room types and merges identical rooms into one row with a quantity. */
export function buildRoomSuggestions(
  readings: FloorPlanReading[],
  roomTypes: RoomTypeOption[]
): RoomSuggestion[] {
  const merged = new Map<string, RoomSuggestion>();
  for (const reading of readings) {
    const dims = reading.size ? parseDimensions(reading.size) : null;
    const roomTypeId = matchRoomType(reading.label, roomTypes);
    const groupKey = [
      roomTypeId ?? key(reading.label),
      dims ? `${dims.width.feet}.${dims.width.inches}x${dims.length.feet}.${dims.length.inches}` : "?",
    ].join("|");
    const existing = merged.get(groupKey);
    if (existing && dims) {
      existing.qty++;
      continue;
    }
    merged.set(existing ? `${groupKey}|${merged.size}` : groupKey, {
      label: reading.label,
      roomTypeId,
      width: dims?.width ?? null,
      length: dims?.length ?? null,
      qty: 1,
    });
  }
  return [...merged.values()];
}
