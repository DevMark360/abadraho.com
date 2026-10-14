"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import {
  CompareAnalysisBox,
  type AnalysisState,
  type CompareAnalysis,
} from "@/components/compare/compare-analysis-box";
import { Button } from "@/components/ui/button";
import { designTw } from "@/config/design-tokens";
import {
  aiVerdictRow,
  countWins,
  figureVerdicts,
  type AiVerdict,
  type VerdictRow,
} from "@/lib/compare-verdict";
import { cn } from "@/lib/utils";
import type { CompareProjectPayload } from "@/types/compare";
import type { ProjectUnit } from "@/types/project-detail";

type Purpose = "living" | "investment";
type AiVerdicts = { location: AiVerdict; developer: AiVerdict };

const PURPOSES: { value: Purpose; label: string }[] = [
  { value: "living", label: "End-User Living" },
  { value: "investment", label: "Investment / Rental Yield" },
];

/** Answers per project pair and purpose; switching units never needs a new request. */
const aiCache = new Map<string, AiVerdicts>();

async function fetchAiVerdicts(ids: [number, number], purpose: Purpose): Promise<AiVerdicts> {
  try {
    const res = await fetch("/api/v1/compare/verdicts", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, purpose }),
    });
    const json = (await res.json()) as { success?: boolean } & Partial<AiVerdicts>;
    return {
      location: json.success ? (json.location ?? null) : null,
      developer: json.success ? (json.developer ?? null) : null,
    };
  } catch {
    return { location: null, developer: null };
  }
}

/** AI verdicts load only when `ask` is called (the "Which unit wins?" button). */
function useAiVerdicts(ids: [number, number], purpose: Purpose) {
  const [first, second] = ids;
  const key = `${first}-${second}:${purpose}`;
  const [state, setState] = useState<{ key: string; value: AiVerdicts | null } | null>(null);
  // The key the card shows now; an answer for an older purpose or pair is not displayed.
  const latest = useRef(key);
  useEffect(() => {
    latest.current = key;
  }, [key]);

  const ask = useCallback(async () => {
    const cached = aiCache.get(key);
    if (cached) {
      setState({ key, value: cached });
      return;
    }
    setState({ key, value: null });
    const value = await fetchAiVerdicts([first, second], purpose);
    // Only answered pairs are kept, so "not available" can be retried with another click.
    if (value.location && value.developer) aiCache.set(key, value);
    if (latest.current === key) setState({ key, value });
  }, [key, first, second, purpose]);

  const current = state?.key === key ? state : null;
  const status: "idle" | "loading" | "done" = !current ? "idle" : current.value ? "done" : "loading";
  return { status, value: current?.value ?? undefined, ask };
}

/** Analyses per unit pair and purpose; only successful answers are kept. */
const analysisCache = new Map<string, CompareAnalysis>();

async function fetchAnalysis(
  projectIds: [number, number],
  unitIds: [number, number],
  purpose: Purpose
): Promise<AnalysisState> {
  try {
    const res = await fetch("/api/v1/compare/analysis", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectIds, unitIds, purpose }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      analysis?: CompareAnalysis;
      message?: string;
    };
    if (json.success && json.analysis) return { status: "done", analysis: json.analysis };
    return { status: "error", message: json.message || "The AI analysis is not available right now." };
  } catch {
    return { status: "error", message: "Could not reach the server." };
  }
}

/** The written AI comparison of the two selected units; loads only when `ask` is called. */
function useAnalysis(projectIds: [number, number], unitIds: [number, number], purpose: Purpose) {
  const [p0, p1] = projectIds;
  const [u0, u1] = unitIds;
  const key = `${p0}:${u0}-${p1}:${u1}:${purpose}`;
  const [state, setState] = useState<{ key: string; value: AnalysisState } | null>(null);
  const latest = useRef(key);
  useEffect(() => {
    latest.current = key;
  }, [key]);

  const ask = useCallback(async () => {
    const cached = analysisCache.get(key);
    if (cached) {
      setState({ key, value: { status: "done", analysis: cached } });
      return;
    }
    setState({ key, value: { status: "loading" } });
    const value = await fetchAnalysis([p0, p1], [u0, u1], purpose);
    if (value.status === "done") analysisCache.set(key, value.analysis);
    if (latest.current === key) setState({ key, value });
  }, [key, p0, p1, u0, u1, purpose]);

  return { state: state?.key === key ? state.value : null, ask };
}

function sideName(project: CompareProjectPayload, unit: ProjectUnit): string {
  const unitName = unit.title ?? unit.name;
  return unitName ? `${project.name} · ${unitName}` : project.name;
}

function WinnerCell({ row, names }: { row: VerdictRow; names: [string, string] }) {
  if (row.pending || row.winner === null) return <span className="text-zinc-400">Checking…</span>;
  if (row.winner === "tie") return <span className="font-semibold text-zinc-700">Even</span>;
  return (
    <span className="inline-flex items-center gap-2 font-semibold text-zinc-900">
      <span
        aria-hidden
        className={cn("h-2.5 w-2.5 shrink-0 rounded-full", row.winner === 0 ? "bg-brand-accent" : "bg-zinc-900")}
      />
      {names[row.winner]}
    </span>
  );
}

/**
 * "Which unit wins": figure rows (price, area, loan) are worked out instantly; location and
 * developer verdicts come from the AI, for the buyer's chosen purpose, only when asked.
 */
export function CompareVerdictCard({
  projects,
  units,
}: {
  projects: [CompareProjectPayload, CompareProjectPayload];
  units: [ProjectUnit, ProjectUnit];
}) {
  const [purpose, setPurpose] = useState<Purpose>("living");
  const ai = useAiVerdicts([projects[0].id, projects[1].id], purpose);
  const analysis = useAnalysis([projects[0].id, projects[1].id], [units[0].id, units[1].id], purpose);
  const loading = ai.status === "loading" || analysis.state?.status === "loading";
  const purposeLabel = PURPOSES.find((p) => p.value === purpose)?.label ?? "";
  const figures = figureVerdicts(units);

  // AI rows appear only after the button is clicked; rows without a verdict are left out.
  const aiRow = (label: string, verdict: AiVerdict | undefined) =>
    ai.status === "idle" ? null : aiVerdictRow(label, loading ? undefined : verdict);
  const rows = [
    aiRow("Location", ai.value?.location),
    figures.totalAmount,
    figures.pricePerSqFt,
    figures.grossArea,
    aiRow("Developer", ai.value?.developer),
    figures.loanAmount,
  ].filter((row): row is VerdictRow => row != null && (row.pending === true || row.winner !== null));

  const names: [string, string] = [sideName(projects[0], units[0]), sideName(projects[1], units[1])];
  const [winsA, winsB] = countWins(rows);
  const decided = rows.filter((r) => r.winner !== null).length;
  const leader = winsA === winsB ? null : winsA > winsB ? 0 : 1;

  return (
    <div className="border-t border-zinc-200">
      <div className="bg-zinc-50/60 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-zinc-700">Buying for</span>
          <div role="radiogroup" aria-label="Buying purpose" className="flex flex-wrap rounded-2xl bg-clay-well p-1 shadow-clay-inset">
            {PURPOSES.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={purpose === option.value}
                onClick={() => setPurpose(option.value)}
                disabled={loading}
                className={cn(
                  "min-h-[40px] rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
                  purpose === option.value ? designTw.navActive : "text-zinc-600 hover:text-zinc-900"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            onClick={() => {
              void ai.ask();
              void analysis.ask();
            }}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden />
            )}
            Which unit wins?
          </Button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {ai.status === "idle" && !analysis.state
            ? "Price, area and loan are compared below. Click the button for an AI analysis of both units, including location and developer, for your purpose."
            : `AI views written for ${purpose === "living" ? "living there" : "investment and rental yield"}.`}
        </p>
      </div>

      <div className="border-y border-zinc-200 bg-zinc-900 px-4 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-white">Which unit wins</p>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="rounded-clay-lg bg-clay-well px-4 py-3 shadow-clay-inset">
          {decided === 0 ? (
            <p className="text-sm text-zinc-600">
              {loading ? "Checking…" : "Not enough figures to compare these units yet."}
            </p>
          ) : leader === null ? (
            <p className="text-base font-semibold text-zinc-900">
              Evenly matched: {winsA} each out of {decided}.
            </p>
          ) : (
            <p className="text-base font-semibold text-zinc-900">
              {names[leader]}{" "}
              <span className="font-normal text-zinc-600">
                wins {leader === 0 ? winsA : winsB} of {decided}.
              </span>
            </p>
          )}
          {decided > 0 ? (
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
              {names.map((name, i) => (
                <span key={i} className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className={cn("h-2 w-2 rounded-full", i === 0 ? "bg-brand-accent" : "bg-zinc-900")}
                  />
                  {name}: {i === 0 ? winsA : winsB}
                </span>
              ))}
            </p>
          ) : null}
        </div>

        {rows.length ? (
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {rows.map((row) => (
              <li
                key={row.label}
                className="grid gap-1 px-4 py-3 sm:grid-cols-[150px_minmax(0,1.2fr)_minmax(0,1fr)] sm:items-center sm:gap-4"
              >
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {row.label}
                  {row.ai ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-zinc-600">
                      <Sparkles className="h-3 w-3" aria-hidden />
                      AI opinion
                    </span>
                  ) : null}
                </p>
                <p className="text-sm">
                  <WinnerCell row={row} names={names} />
                </p>
                <p className="text-sm text-zinc-600">{row.pending ? "" : row.reason}</p>
              </li>
            ))}
          </ul>
        ) : null}

        {analysis.state ? (
          <CompareAnalysisBox state={analysis.state} names={names} purposeLabel={purposeLabel} />
        ) : null}

        <p className="text-xs leading-relaxed text-zinc-500">
          Total amount, price per sq.ft, gross area and loan amount are worked out from the listed
          figures. The AI recommendation and the location and developer verdicts are opinions based
          on these figures and general public knowledge and can be wrong, so check them yourself
          before deciding.
        </p>
      </div>
    </div>
  );
}
