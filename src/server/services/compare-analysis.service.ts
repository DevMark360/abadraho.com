import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { GROQ_COMPARE_KEY_ENV, groqChatWithFallback, parseJsonObject } from "@/server/groq-client";
import type { BuyerPurpose } from "@/server/services/compare-verdict.service";

/** Larger model than the one-line verdicts: this writes a short report from the figures. */
const DEFAULT_ANALYSIS_MODEL = "llama-3.3-70b-versatile";

const PURPOSE_LABEL: Record<BuyerPurpose, string> = {
  living: "End-User Living",
  investment: "Investment / Rental Yield",
};

const MEMORY_TTL_MS = 6 * 60 * 60_000;
const MEMORY_MAX = 300;
const MAX_SUMMARY = 400;
const MAX_POINT = 260;
const MAX_POINTS = 3;

/** One unit's figures exactly as sent to Groq. Money is pre-formatted so the model quotes it as-is. */
type UnitSpec = {
  label: "Unit A" | "Unit B";
  name: string;
  project: string;
  unit: string | null;
  location: string | null;
  developer: string | null;
  listedPrice: string | null;
  totalAmount: string | null;
  downPayment: string | null;
  monthlyInstallment: string | null;
  installmentMonths: number | null;
  grossAreaSqFt: number | null;
  pricePerSqFt: string | null;
  loanAmount: string | null;
};

export type CompareAnalysis = {
  /** Which unit the analysis favours overall; "depends" when it hinges on the buyer. */
  winner: "first" | "second" | "depends";
  summary: string;
  financial: string[];
  space: string[];
  locationDeveloper: string[];
  chooseFirst: string;
  chooseSecond: string;
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
const money = (value: number | null) => (value != null ? formatPrice(value) : null);

function locationLabel(area: { name: string; city: { name: string } | null } | null): string | null {
  const name = area?.name.trim();
  if (!name) return null;
  const city = area?.city?.name.trim();
  return city && !name.toLowerCase().includes(city.toLowerCase()) ? `${name}, ${city}` : name;
}

/**
 * Reads both units from the database (never from the request), so the figures are the listed
 * ones and the endpoint can't be used to send arbitrary text to Groq.
 */
export async function loadUnitSpecs(
  projectIds: [number, number],
  unitIds: [number, number]
): Promise<[UnitSpec, UnitSpec]> {
  const rows = await prisma.unit.findMany({
    where: {
      id: { in: unitIds },
      isArchive: false,
      project: { status: 1, isArchive: false },
    },
    select: {
      id: true,
      projectId: true,
      title: true,
      price: true,
      totalUnitAmount: true,
      downPayment: true,
      monthlyInstallment: true,
      installment: true,
      grossArea: true,
      loanAmount: true,
      project: {
        select: {
          name: true,
          installmentLength: true,
          location: { select: { name: true, city: { select: { name: true } } } },
          owners: { take: 1, select: { builder: { select: { fullName: true } } } },
        },
      },
    },
  });

  const units = unitIds.map((id, i) => rows.find((r) => r.id === id && r.projectId === projectIds[i]));
  if (!units[0] || !units[1]) throw new CompareAnalysisInputError("Unit not found");

  const sameProject = units[0].project.name.trim().toLowerCase() === units[1].project.name.trim().toLowerCase();
  const specs = units.map((u, i): UnitSpec => {
    const project = u!.project.name.trim();
    const unit = u!.title?.trim() || null;
    const total = positive(u!.totalUnitAmount) ?? positive(u!.price);
    const gross = positive(u!.grossArea);
    return {
      label: i === 0 ? "Unit A" : "Unit B",
      // Two units of one project are told apart by unit name.
      name: sameProject && unit ? `${project} ${unit}` : project,
      project,
      unit,
      location: locationLabel(u!.project.location),
      developer: u!.project.owners[0]?.builder.fullName.trim() || null,
      listedPrice: money(positive(u!.price)),
      totalAmount: money(total),
      downPayment: money(positive(u!.downPayment)),
      monthlyInstallment: money(positive(u!.monthlyInstallment)),
      installmentMonths: positive(u!.installment) ?? positive(u!.project.installmentLength),
      grossAreaSqFt: gross,
      pricePerSqFt: total != null && gross != null ? money(Math.round(total / gross)) : null,
      loanAmount: money(num(u!.loanAmount)),
    };
  });
  return [specs[0], specs[1]];
}

const SYSTEM_PROMPT = [
  "You are an expert Pakistani real estate advisor writing a short, professional market analysis",
  "for a buyer choosing between two property units (Unit A and Unit B).",
  "Use only the figures provided and quote amounts exactly as written; never invent or recalculate numbers.",
  "A null figure is not listed: say it is not listed rather than guessing.",
  "Location and developer remarks come from well-known general knowledge of Pakistan's property market;",
  "if you are not reasonably sure about one, say so briefly instead of guessing.",
  "Tailor every point to the buyer's purpose.",
  "Refer to units by their name field, never as 'Unit A' or 'Unit B'.",
  "Keep each bullet to one sentence of at most 30 words. Use plain text without markdown.",
  "Reply with JSON only, in exactly this shape:",
  '{"winner":"A"|"B"|"depends",',
  '"summary":"1-2 sentence recommendation saying which unit wins for this purpose and why, including any condition where the other wins",',
  '"financial":["1-3 bullets on down payment and monthly installment burden, installment period, total cost and loan"],',
  '"space":["1-3 bullets on gross area and price per sq.ft value"],',
  '"locationDeveloper":["1-3 bullets on location and developer for this purpose"],',
  '"chooseA":"the condition under which the buyer should choose Unit A, without the words Choose or if at the start",',
  '"chooseB":"the condition under which the buyer should choose Unit B, without the words Choose or if at the start"}',
].join(" ");

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  const text = value.replace(/\*\*|__|`/g, "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function cleanPoints(value: unknown): string[] {
  const list = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return list
    .map((item) => cleanText(item, MAX_POINT).replace(/^[-•*]\s*/, ""))
    .filter(Boolean)
    .slice(0, MAX_POINTS);
}

/** Drops a leading "Choose X if" the model adds despite the instruction; the UI writes its own. */
const cleanCondition = (value: unknown) =>
  cleanText(value, MAX_POINT)
    .replace(/^choose\b[^,]*?\bif\b\s*/i, "")
    .replace(/^if\s+/i, "")
    // Reads on from "Choose X if": "The buyer…" becomes "the buyer…", acronyms stay.
    .replace(/^([A-Z])(?=[a-z])/, (c) => c.toLowerCase());

function parseAnalysis(content: string): CompareAnalysis {
  const parsed = parseJsonObject(content);
  const raw = String(parsed.winner ?? "").trim().toUpperCase();
  const analysis: CompareAnalysis = {
    winner: raw === "A" ? "first" : raw === "B" ? "second" : "depends",
    summary: cleanText(parsed.summary, MAX_SUMMARY),
    financial: cleanPoints(parsed.financial),
    space: cleanPoints(parsed.space),
    locationDeveloper: cleanPoints(parsed.locationDeveloper),
    chooseFirst: cleanCondition(parsed.chooseA),
    chooseSecond: cleanCondition(parsed.chooseB),
  };
  if (!analysis.summary || !analysis.chooseFirst || !analysis.chooseSecond) {
    throw new Error("analysis reply is incomplete");
  }
  return analysis;
}

async function askGroq(specs: [UnitSpec, UnitSpec], purpose: BuyerPurpose): Promise<CompareAnalysis> {
  const payload = {
    buyerPurpose: PURPOSE_LABEL[purpose],
    currency: "PKR",
    units: specs,
  };
  const { content } = await groqChatWithFallback({
    model: process.env.GROQ_COMPARE_MODEL?.trim() || DEFAULT_ANALYSIS_MODEL,
    apiKeyEnv: GROQ_COMPARE_KEY_ENV,
    system: SYSTEM_PROMPT,
    content: JSON.stringify(payload),
    json: true,
    temperature: 0.2,
    maxTokens: 900,
    timeoutMs: 40_000,
  });
  return parseAnalysis(content);
}

const analysisKey = (specs: [UnitSpec, UnitSpec], purpose: BuyerPurpose) =>
  createHash("sha1").update(JSON.stringify([purpose, specs])).digest("hex");

/**
 * Structured AI comparison of two units for the buyer's purpose. The same figures and purpose
 * are answered from memory for a few hours, and concurrent identical requests share one call.
 * Throws GroqError when Groq can't answer.
 */
export async function analyzeUnits(specs: [UnitSpec, UnitSpec], purpose: BuyerPurpose): Promise<CompareAnalysis> {
  const key = analysisKey(specs, purpose);
  const cached = memory.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;

  let pending = inFlight.get(key);
  if (!pending) {
    pending = askGroq(specs, purpose)
      .then((value) => {
        memory.delete(key);
        memory.set(key, { value, expires: Date.now() + MEMORY_TTL_MS });
        if (memory.size > MEMORY_MAX) memory.delete(memory.keys().next().value!);
        return value;
      })
      .finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  return pending;
}

/** True when the same figures and purpose were answered recently (no Groq call needed). */
export function isAnalysisCached(specs: [UnitSpec, UnitSpec], purpose: BuyerPurpose): boolean {
  const key = analysisKey(specs, purpose);
  const cached = memory.get(key);
  return Boolean(cached && cached.expires > Date.now()) || inFlight.has(key);
}
