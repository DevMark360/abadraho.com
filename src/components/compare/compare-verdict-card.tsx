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
import { cn } from "@/lib/utils";
import type { CompareProjectPayload } from "@/types/compare";
import type { ProjectUnit } from "@/types/project-detail";

type Purpose = "living" | "investment";

const PURPOSES: { value: Purpose; label: string }[] = [
  { value: "living", label: "End-User Living" },
  { value: "investment", label: "Investment / Rental Yield" },
];

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

/** "Which unit wins": an AI recommendation of the two units for the buyer's purpose, only when asked. */
export function CompareVerdictCard({
  projects,
  units,
}: {
  projects: [CompareProjectPayload, CompareProjectPayload];
  units: [ProjectUnit, ProjectUnit];
}) {
  const [purpose, setPurpose] = useState<Purpose>("living");
  const analysis = useAnalysis([projects[0].id, projects[1].id], [units[0].id, units[1].id], purpose);
  const loading = analysis.state?.status === "loading";
  const purposeLabel = PURPOSES.find((p) => p.value === purpose)?.label ?? "";
  const names: [string, string] = [sideName(projects[0], units[0]), sideName(projects[1], units[1])];

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
          {!analysis.state
            ? "Click the button for an AI analysis of both units, covering budget, space, location and developer, for your purpose."
            : `AI views written for ${purpose === "living" ? "living there" : "investment and rental yield"}.`}
        </p>
      </div>

      <div className="border-y border-zinc-200 bg-zinc-900 px-4 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-white">Which unit wins</p>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {analysis.state ? (
          <CompareAnalysisBox
            state={analysis.state}
            names={names}
            purposeLabel={purposeLabel}
            onRetry={() => void analysis.ask()}
          />
        ) : (
          <p className="text-sm text-zinc-600">
            Choose what you are buying for, then click Which unit wins? to see the AI recommendation here.
          </p>
        )}

        <p className="text-xs leading-relaxed text-zinc-500">
          The AI recommendation is an opinion based on the listed figures and general public
          knowledge and can be wrong, so check it yourself before deciding.
        </p>
      </div>
    </div>
  );
}
