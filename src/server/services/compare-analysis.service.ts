import { createHash } from "node:crypto";
import { tableExists } from "@/lib/db-table-exists";
import { prisma } from "@/lib/prisma";
import { queryRaw } from "@/lib/prisma-raw";
import { summarizeRoomTypesByGroup } from "@/lib/unit-metrics";
import { formatPrice } from "@/lib/utils";
import { GROQ_COMPARE_KEY_ENV, GroqError, groqChatWithFallback, parseJsonObject } from "@/server/groq-client";
import type { BuyerPurpose } from "@/server/services/compare-verdict.service";
import { loadAdminRoomGroups } from "@/server/services/unit-room-group.service";

/** Larger model than the one-line verdicts: this writes a short report from the figures. */
const DEFAULT_ANALYSIS_MODEL = "llama-3.3-70b-versatile";

/**
 * Bump whenever the prompt, payload or reply shape changes: it is part of the cache key, so old
 * answers are never served for the new prompt.
 */
const PROMPT_VERSION = "2";

const PURPOSE_LABEL: Record<BuyerPurpose, string> = {
  living: "End-User Living",
  investment: "Investment / Rental Yield",
};

/** What the buyer weighs most for each purpose; sent with the figures. */
const PURPOSE_FOCUS: Record<BuyerPurpose, string> = {
  living:
    "Living there: affordable monthly burden and down payment, usable rooms and layout for a family, room sizes, location for daily life, developer delivery record, construction status, amenities and utilities.",
  investment:
    "Investment / rent: lower entry cost and total cost, price per sq.ft, resale and rental demand of the location and unit type, developer delivery record, construction status, and how much is still owed later.",
};

/** Cached answers stay valid while the figures stay the same; the TTL only refreshes the wording. */
const MEMORY_TTL_MS = 24 * 60 * 60_000;
const MEMORY_MAX = 300;
const MAX_SUMMARY = 420;
const MAX_POINT = 240;
const MAX_POINTS = 3;
const MAX_CRITERIA = 6;
/** Listed plans within this many rupees of the total count as fully itemised. */
const PLAN_TOLERANCE = 1000;

type Money = string;

/** Project facts sent to Groq; only listed values, absent keys mean "not listed". */
type ProjectFacts = {
  project: string;
  developer?: string;
  location?: string;
  address?: string;
  propertyType?: string;
  status?: string;
  amenities?: string[];
  utilities?: string[];
  highlights?: string[];
  about?: string;
};

/** The listed payment plan, with the parts that can be added up already added up. */
type PlanFacts = {
  downPayment?: Money;
  installments?: string;
  installmentsTotal?: Money;
  loanOrBalance?: Money;
  /** Part of the total the listed plan doesn't break down (often in the payment plan image). */
  notItemized?: Money;
  paymentPlanImage?: boolean;
};

type UnitFacts = {
  name: string;
  unit?: string;
  unitType?: string;
  description?: string;
  price?: Money;
  totalAmount?: Money;
  pricePerSqFt?: Money;
  grossAreaSqFt?: number;
  roomsCoveredSqFt?: number;
  roomSummary?: string;
  rooms?: string[] | Record<string, string[]>;
  plan?: PlanFacts;
  floorPlanImage?: boolean;
};

/** One side of the comparison: the unit's facts plus its project's, unless both share a project. */
export type UnitSpec = UnitFacts & Partial<ProjectFacts>;

export type ComparePayload = {
  purpose: string;
  focus: string;
  currency: "PKR";
  sharedProject?: ProjectFacts;
  A: UnitSpec;
  B: UnitSpec;
};

export type CriterionEdge = "first" | "second" | "even";

export type CompareCriterion = {
  name: string;
  weight: "high" | "medium" | "low";
  edge: CriterionEdge;
  note: string;
};

/** Reply shape. The first seven fields are the original contract; the rest were added in v2. */
export type CompareAnalysis = {
  /** Which unit the analysis favours overall; "depends" only for replies that name no winner. */
  winner: "first" | "second" | "depends";
  summary: string;
  financial: string[];
  space: string[];
  locationDeveloper: string[];
  chooseFirst: string;
  chooseSecond: string;
  confidence?: "high" | "medium" | "low";
  reasons?: string[];
  criteria?: CompareCriterion[];
  layout?: string[];
  otherAdvantages?: string[];
  warnings?: string[];
};

export class CompareAnalysisInputError extends Error {}

const memory = new Map<string, { value: CompareAnalysis; expires: number }>();
const inFlight = new Map<string, Promise<CompareAnalysis>>();

const num = (value: unknown): number | null => {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const positive = (value: unknown) => {
  const n = num(value);
  return n != null && n > 0 ? n : null;
};
const money = (value: number | null): Money | undefined => (value != null ? formatPrice(value) : undefined);
const round = (value: number) => Math.round(value * 100) / 100;

/** Short plain text: HTML and entities removed, whitespace collapsed, cut at a word. */
function plain(value: string | null | undefined, max: number): string | undefined {
  if (!value) return undefined;
  const text = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&rsquo;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return undefined;
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).trimEnd()}…`;
}

const uniqueNames = (names: (string | null | undefined)[], max: number) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const clean = name?.replace(/\s+/g, " ").trim();
    if (!clean || seen.has(clean.toLowerCase())) continue;
    seen.add(clean.toLowerCase());
    out.push(clean);
  }
  return out.length ? out.slice(0, max) : undefined;
};

function locationLabel(area: { name: string; city: { name: string } | null } | null): string | undefined {
  const name = area?.name.trim();
  if (!name) return undefined;
  const city = area?.city?.name.trim();
  return city && !name.toLowerCase().includes(city.toLowerCase()) ? `${name}, ${city}` : name;
}

const FALLBACK_INSTALLMENT_TYPES: Record<number, string> = { 1: "monthly", 2: "quarterly", 3: "half-yearly" };
/** Months between payments, for the types whose count can be worked out from the length. */
const INSTALLMENT_EVERY: Record<number, number> = { 1: 1, 2: 3, 3: 6 };
let installmentTypeNames: Promise<Record<number, string>> | null = null;

/** Installment type names from the database table the admin form uses, or the built-in ones. */
function loadInstallmentTypeNames(): Promise<Record<number, string>> {
  installmentTypeNames ??= (async () => {
    try {
      for (const table of ["installment_types", "installment_type"]) {
        if (!(await tableExists(table))) continue;
        const rows = await queryRaw<{ id: unknown; name: string }[]>(`SELECT id, name FROM \`${table}\``);
        const names: Record<number, string> = { ...FALLBACK_INSTALLMENT_TYPES };
        for (const row of rows) if (row.name?.trim()) names[Number(row.id)] = row.name.trim().toLowerCase();
        return names;
      }
    } catch {
      // Built-in names below.
    }
    return FALLBACK_INSTALLMENT_TYPES;
  })();
  return installmentTypeNames;
}

function feetInches(feet: number | null, inches: number | null): string | null {
  if (feet == null || feet <= 0) return null;
  return inches ? `${feet}'${inches}"` : `${feet}'`;
}

type RoomRow = {
  id: number;
  widthFeet: number | null;
  widthInches: number | null;
  lengthFeet: number | null;
  lengthInches: number | null;
  coveredArea: unknown;
  extras: string | null;
  roomType: { name: string };
};

/** "Bed 14'x11' 154sqft" (with "x2" when the row stands for two rooms). */
function roomLine(room: RoomRow): string {
  const width = feetInches(room.widthFeet, room.widthInches);
  const length = feetInches(room.lengthFeet, room.lengthInches);
  const size = width && length ? `${width}x${length}` : (width ?? length);
  const covered = positive(room.coveredArea);
  const qty = Number.parseInt(room.extras ?? "", 10);
  return [
    room.roomType.name.trim(),
    qty > 1 ? `x${qty}` : null,
    size,
    covered != null ? `${round(covered)}sqft` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

type UnitRow = Awaited<ReturnType<typeof queryUnits>>[number];

function queryUnits(unitIds: number[]) {
  return prisma.unit.findMany({
    where: {
      id: { in: unitIds },
      isArchive: false,
      project: { status: 1, isArchive: false },
    },
    select: {
      id: true,
      projectId: true,
      title: true,
      rooms: true,
      description: true,
      price: true,
      totalUnitAmount: true,
      downPayment: true,
      monthlyInstallment: true,
      installment: true,
      installmentType: true,
      grossArea: true,
      loanAmount: true,
      floorPlanImg: true,
      paymentPlanImg: true,
      unitType: { select: { title: true } },
      // The same rooms the admin unit form lists.
      roomTypeUnits: {
        where: { isArchive: false },
        orderBy: { id: "asc" },
        select: {
          id: true,
          widthFeet: true,
          widthInches: true,
          lengthFeet: true,
          lengthInches: true,
          coveredArea: true,
          extras: true,
          roomType: { select: { name: true } },
        },
      },
      project: {
        select: {
          id: true,
          name: true,
          address: true,
          details: true,
          installmentLength: true,
          progressLabel: true,
          progress: { select: { name: true } },
          projectType: { select: { title: true } },
          location: { select: { name: true, city: { select: { name: true } } } },
          owners: { take: 1, select: { builder: { select: { fullName: true } } } },
          projectInfo: {
            select: {
              mainHeading: true,
              bullet1: true,
              bullet2: true,
              bullet3: true,
              bullet4: true,
              bullet5: true,
              bullet6: true,
            },
          },
          projectAmenities: { where: { isActive: true }, select: { amenity: { select: { name: true, isArchive: true } } } },
          projectUtilities: { select: { utility: { select: { name: true, isArchive: true } } } },
        },
      },
    },
  });
}

function projectFacts(p: UnitRow["project"]): ProjectFacts {
  const info = p.projectInfo;
  return {
    project: p.name.trim(),
    developer: p.owners[0]?.builder.fullName.trim() || undefined,
    location: locationLabel(p.location),
    address: plain(p.address, 120),
    propertyType: p.projectType?.title.trim() || undefined,
    status: p.progress?.name.trim() || p.progressLabel?.trim() || undefined,
    amenities: uniqueNames(
      p.projectAmenities.filter((a) => !a.amenity.isArchive).map((a) => a.amenity.name),
      15
    ),
    utilities: uniqueNames(
      p.projectUtilities.filter((u) => !u.utility.isArchive).map((u) => u.utility.name),
      10
    ),
    highlights: uniqueNames(
      [info?.mainHeading, info?.bullet1, info?.bullet2, info?.bullet3, info?.bullet4, info?.bullet5, info?.bullet6].map(
        (b) => plain(b, 110)
      ),
      5
    ),
    about: plain(p.details, 260),
  };
}

function planFacts(u: UnitRow, typeNames: Record<number, string>): PlanFacts | undefined {
  const down = positive(u.downPayment);
  const perInstallment = positive(u.monthlyInstallment);
  const lengthMonths = positive(u.installment) ?? positive(u.project.installmentLength);
  const loan = positive(u.loanAmount);
  const total = positive(u.totalUnitAmount) ?? positive(u.price);
  const typeId = u.installmentType ?? 1;
  const typeName = typeNames[typeId] ?? "periodic";
  const every = INSTALLMENT_EVERY[typeId];

  let installments: string | undefined;
  let installmentsTotal: number | null = null;
  if (perInstallment != null) {
    const count = every && lengthMonths != null ? Math.floor(lengthMonths / every) : null;
    if (count) {
      installmentsTotal = perInstallment * count;
      installments = `${count} ${typeName} payments of ${formatPrice(perInstallment)} over ${lengthMonths} months`;
    } else {
      installments = `${formatPrice(perInstallment)} ${typeName}${lengthMonths != null ? `, installment length ${lengthMonths}` : ""}`;
    }
  }

  // What the listed parts add up to against the total; the gap is shown, never guessed at.
  let notItemized: number | null = null;
  if (total != null && down != null && installmentsTotal != null) {
    const gap = total - down - installmentsTotal - (loan ?? 0);
    if (gap > PLAN_TOLERANCE) notItemized = gap;
  }

  const plan: PlanFacts = {
    downPayment: money(down),
    installments,
    installmentsTotal: money(installmentsTotal),
    loanOrBalance: money(loan),
    notItemized: money(notItemized),
    paymentPlanImage: u.paymentPlanImg ? true : undefined,
  };
  return Object.values(plan).some((v) => v !== undefined) ? plan : undefined;
}

function roomFacts(u: UnitRow, groups: Awaited<ReturnType<typeof loadAdminRoomGroups>>): UnitFacts["rooms"] {
  if (!u.roomTypeUnits.length) return undefined;
  if (!groups.groups.length) return u.roomTypeUnits.map(roomLine);
  const sections: Record<string, string[]> = {};
  for (const group of groups.groups) {
    const lines = u.roomTypeUnits.filter((r) => groups.roomGroupIds.get(r.id) === group.id).map(roomLine);
    if (lines.length) sections[group.name] = lines;
  }
  const rest = u.roomTypeUnits.filter((r) => !groups.groups.some((g) => g.id === groups.roomGroupIds.get(r.id)));
  if (rest.length) sections["Other rooms"] = rest.map(roomLine);
  return sections;
}

async function unitFacts(u: UnitRow, name: string, typeNames: Record<number, string>): Promise<UnitFacts> {
  const total = positive(u.totalUnitAmount) ?? positive(u.price);
  const price = positive(u.price);
  const gross = positive(u.grossArea);
  const covered = u.roomTypeUnits.reduce((sum, r) => sum + (positive(r.coveredArea) ?? 0), 0);
  const groups = await loadAdminRoomGroups(u.id).catch(() => ({
    enabled: false,
    groups: [],
    roomGroupIds: new Map<number, number>(),
  }));
  const unitName = u.title?.trim() || undefined;
  const description = plain(u.description, 160);
  return {
    name,
    unit: unitName,
    unitType: u.unitType?.title.trim() || undefined,
    // Skipped when it only repeats the unit name.
    description: description && description.toLowerCase() !== unitName?.toLowerCase() ? description : undefined,
    // The price is sent only when it differs from the total (otherwise it's the same number twice).
    price: price != null && price !== total ? money(price) : undefined,
    totalAmount: money(total),
    pricePerSqFt: total != null && gross != null ? money(Math.round(total / gross)) : undefined,
    grossAreaSqFt: gross != null ? round(gross) : undefined,
    roomsCoveredSqFt: covered > 0 ? round(covered) : undefined,
    roomSummary:
      // Per layout / floor for grouped units, so two floors aren't added up into one.
      summarizeRoomTypesByGroup({
        roomGroups: groups.groups,
        roomBreakdown: u.roomTypeUnits.map((r) => ({
          id: r.id,
          roomTypeName: r.roomType.name,
          icon: null,
          count: r.extras,
          dimensions: null,
          coveredArea: null,
          groupId: groups.roomGroupIds.get(r.id) ?? null,
        })),
      }) ||
      plain(u.rooms, 60),
    rooms: roomFacts(u, groups),
    plan: planFacts(u, typeNames),
    floorPlanImage: u.floorPlanImg ? true : undefined,
  };
}

/** JSON without undefined keys or empty lists, so absent data costs no tokens. */
function compact<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v: unknown) => (Array.isArray(v) && v.length === 0 ? undefined : v))
  ) as T;
}

/**
 * Reads both units from the database (never from the request), so the figures are the listed
 * ones and the endpoint can't be used to send arbitrary text to Groq.
 */
export async function loadComparePayload(
  projectIds: [number, number],
  unitIds: [number, number],
  purpose: BuyerPurpose
): Promise<ComparePayload> {
  const [rows, typeNames] = await Promise.all([queryUnits(unitIds), loadInstallmentTypeNames()]);
  const found = unitIds.map((id, i) => rows.find((r) => r.id === id && r.projectId === projectIds[i]));
  const [a, b] = found;
  if (!a || !b) throw new CompareAnalysisInputError("Unit not found");

  const sameProject = a.projectId === b.projectId;
  const sameName = a.project.name.trim().toLowerCase() === b.project.name.trim().toLowerCase();
  const nameOf = (u: UnitRow) => {
    const project = u.project.name.trim();
    const unit = u.title?.trim();
    // Two units of one project (or of two projects with one name) are told apart by unit name.
    return (sameProject || sameName) && unit ? `${project} ${unit}` : project;
  };

  const [factsA, factsB] = await Promise.all([
    unitFacts(a, nameOf(a), typeNames),
    unitFacts(b, nameOf(b), typeNames),
  ]);
  const payload: ComparePayload = sameProject
    ? {
        purpose: PURPOSE_LABEL[purpose],
        focus: PURPOSE_FOCUS[purpose],
        currency: "PKR",
        sharedProject: projectFacts(a.project),
        A: factsA,
        B: factsB,
      }
    : {
        purpose: PURPOSE_LABEL[purpose],
        focus: PURPOSE_FOCUS[purpose],
        currency: "PKR",
        A: { ...projectFacts(a.project), ...factsA },
        B: { ...projectFacts(b.project), ...factsB },
      };
  return compact(payload);
}

const SYSTEM_PROMPT = `You are an expert Pakistani real estate advisor. Compare unit A and unit B for the buyer purpose and focus given, and pick ONE winner: the unit best supported by the data for that purpose. Answer "depends" never.

Data rules:
- Use only the JSON given. Quote money exactly as written; never recalculate or invent figures.
- A missing key means not listed: treat it as unknown. Never invent amenities, utilities, handover or possession dates, rent, rental yield, appreciation or maintenance charges. Rent and yield are always unknown; judge investment on entry cost, price per sq.ft, total cost, location demand and developer.
- plan.notItemized is part of the total the listed plan does not break down (likely in the payment plan image): mention it as a warning, never guess its schedule.
- loanOrBalance is still owed after the listed installments.
- Location and developer remarks may use well-known general knowledge of Pakistan's property market; if unsure, say so briefly.
- sharedProject means both units are in the same project: compare the units, not the project.
- Weigh criteria by the purpose focus, not by counting fields.
- Refer to units by their name field, never as "unit A" or "unit B".
- Plain text, no markdown. Each string is one sentence, at most 28 words.

Reply with JSON only:
{"winner":"A"|"B",
"confidence":"high"|"medium"|"low",
"summary":"1-2 sentences: which unit wins for this purpose and the decisive reason",
"reasons":["2-3 strongest reasons the winner wins for this purpose"],
"criteria":[{"name":"short criterion, max 4 words","weight":"high"|"medium"|"low","edge":"A"|"B"|"even","note":"short evidence"}],
"financial":["1-3 points: down payment, installment burden, total cost, loan or balance"],
"space":["1-2 points: gross area, covered area, price per sq.ft"],
"layout":["1-2 points comparing rooms, sizes and layout from the room lists"],
"locationDeveloper":["1-2 points on location, developer and status for this purpose"],
"otherAdvantages":["1-2 real advantages of the losing unit"],
"warnings":["0-3 things to verify: unknown or unitemized data that could change the decision"],
"chooseA":"condition to choose A, without leading Choose or if",
"chooseB":"condition to choose B, without leading Choose or if"}
criteria: 4-6 items that matter for this purpose, most important first.`;

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const text = value.replace(/\*\*|__|`|#+\s/g, "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function cleanPoints(value: unknown, max = MAX_POINTS): string[] {
  const list = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return list
    .map((item) => cleanText(item, MAX_POINT).replace(/^[-•*]\s*/, ""))
    .filter(Boolean)
    .slice(0, max);
}

/** Drops a leading "Choose X if" the model adds despite the instruction; the UI writes its own. */
const cleanCondition = (value: unknown) =>
  cleanText(value, MAX_POINT)
    .replace(/^choose\b[^,]*?\bif\b\s*/i, "")
    .replace(/^if\s+/i, "")
    // Reads on from "Choose X if": "The buyer…" becomes "the buyer…", acronyms stay.
    .replace(/^([A-Z])(?=[a-z])/, (c) => c.toLowerCase());

const side = (value: unknown): "first" | "second" | null => {
  const raw = String(value ?? "").trim().toUpperCase();
  return raw === "A" ? "first" : raw === "B" ? "second" : null;
};

const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | undefined => {
  const raw = String(value ?? "").trim().toLowerCase();
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined;
};

function cleanCriteria(value: unknown): CompareCriterion[] {
  if (!Array.isArray(value)) return [];
  const out: CompareCriterion[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const name = cleanText(row.name, 40);
    if (!name) continue;
    out.push({
      name,
      weight: oneOf(row.weight, ["high", "medium", "low"] as const) ?? "medium",
      edge: side(row.edge) ?? "even",
      note: cleanText(row.note, 180),
    });
  }
  return out.slice(0, MAX_CRITERIA);
}

const WEIGHT_SCORE = { high: 3, medium: 2, low: 1 } as const;

function parseAnalysis(content: string): CompareAnalysis {
  const parsed = parseJsonObject(content);
  const criteria = cleanCriteria(parsed.criteria);
  let winner: CompareAnalysis["winner"] = side(parsed.winner) ?? "depends";
  if (winner === "depends" && criteria.length) {
    // No winner named: the side ahead on purpose-weighted criteria.
    const score = (edge: CriterionEdge) =>
      criteria.filter((c) => c.edge === edge).reduce((sum, c) => sum + WEIGHT_SCORE[c.weight], 0);
    const [first, second] = [score("first"), score("second")];
    if (first !== second) winner = first > second ? "first" : "second";
  }
  const analysis: CompareAnalysis = {
    winner,
    summary: cleanText(parsed.summary, MAX_SUMMARY),
    financial: cleanPoints(parsed.financial),
    space: cleanPoints(parsed.space, 2),
    locationDeveloper: cleanPoints(parsed.locationDeveloper, 2),
    chooseFirst: cleanCondition(parsed.chooseA),
    chooseSecond: cleanCondition(parsed.chooseB),
    confidence: oneOf(parsed.confidence, ["high", "medium", "low"] as const),
    reasons: cleanPoints(parsed.reasons),
    criteria,
    layout: cleanPoints(parsed.layout, 2),
    otherAdvantages: cleanPoints(parsed.otherAdvantages, 2),
    warnings: cleanPoints(parsed.warnings),
  };
  if (!analysis.summary || !analysis.chooseFirst || !analysis.chooseSecond) {
    throw new Error("analysis reply is incomplete");
  }
  return analysis;
}

/** GROQ_COMPARE_MODEL, unless empty or literally "default". */
const analysisModel = () => {
  const model = process.env.GROQ_COMPARE_MODEL?.trim();
  return model && model.toLowerCase() !== "default" ? model : DEFAULT_ANALYSIS_MODEL;
};

/** Errors worth one more try: a reply that wasn't usable JSON. Limits, timeouts and setup aren't. */
const retryable = (e: unknown) => !(e instanceof GroqError) || e.code === "bad_output";

async function askGroq(payload: ComparePayload): Promise<CompareAnalysis> {
  const request = (temperature: number) =>
    groqChatWithFallback({
      model: analysisModel(),
      apiKeyEnv: GROQ_COMPARE_KEY_ENV,
      system: SYSTEM_PROMPT,
      content: JSON.stringify(payload),
      json: true,
      temperature,
      maxTokens: 1300,
      timeoutMs: 35_000,
    }).then(({ content }) => parseAnalysis(content));

  try {
    return await request(0.2);
  } catch (e) {
    if (!retryable(e)) throw e;
    console.warn("[compare/analysis] unusable reply, retrying once:", e instanceof Error ? e.message : e);
    try {
      return await request(0);
    } catch (retryError) {
      if (retryError instanceof GroqError && retryError.code !== "bad_output") throw retryError;
      throw new GroqError("The AI reply could not be read.", "bad_output", 502);
    }
  }
}

/** Same figures, purpose, prompt version and model: same answer. */
const analysisKey = (payload: ComparePayload) =>
  createHash("sha1").update(JSON.stringify([PROMPT_VERSION, analysisModel(), payload])).digest("hex");

/**
 * Structured AI comparison of two units for the buyer's purpose. Identical requests are answered
 * from memory and concurrent ones share one call. When Groq fails, an older answer for exactly the
 * same figures is returned instead (the figures being the same, it is still accurate).
 * Throws GroqError when Groq can't answer and there is nothing to fall back on.
 */
export async function analyzeUnits(payload: ComparePayload): Promise<CompareAnalysis> {
  const key = analysisKey(payload);
  const cached = memory.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;

  let pending = inFlight.get(key);
  if (!pending) {
    pending = askGroq(payload)
      .then((value) => {
        memory.delete(key);
        memory.set(key, { value, expires: Date.now() + MEMORY_TTL_MS });
        if (memory.size > MEMORY_MAX) memory.delete(memory.keys().next().value!);
        return value;
      })
      .catch((e: unknown) => {
        if (cached) return cached.value;
        throw e;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  return pending;
}

/** True when this exact comparison is answered or being answered (no new Groq call needed). */
export function isAnalysisCached(payload: ComparePayload): boolean {
  const key = analysisKey(payload);
  const cached = memory.get(key);
  return Boolean(cached && cached.expires > Date.now()) || inFlight.has(key);
}
