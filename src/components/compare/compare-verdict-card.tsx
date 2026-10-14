"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
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

type AiVerdicts = { location: AiVerdict; developer: AiVerdict };

/** AI verdicts depend only on the two projects, so switching units never refetches. */
const aiCache = new Map<string, AiVerdicts>();

function useAiVerdicts(ids: [number, number]): AiVerdicts | undefined {
  const key = ids.join("-");
  const [result, setResult] = useState<{ key: string; value: AiVerdicts } | null>(() => {
    const cached = aiCache.get(key);
    return cached ? { key, value: cached } : null;
  });

  useEffect(() => {
    const cached = aiCache.get(key);
    if (cached) {
      setResult({ key, value: cached });
      return;
    }
    let cancelled = false;
    fetch("/api/v1/compare/verdicts", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: key.split("-").map(Number) }),
    })
      .then((r) => r.json())
      .then((json: { success?: boolean } & Partial<AiVerdicts>) => {
        const value: AiVerdicts = {
          location: json.success ? (json.location ?? null) : null,
          developer: json.success ? (json.developer ?? null) : null,
        };
        // Answered pairs are kept; "not available" may succeed on the next visit.
        if (value.location && value.developer) aiCache.set(key, value);
        if (!cancelled) setResult({ key, value });
      })
      .catch(() => {
        if (!cancelled) setResult({ key, value: { location: null, developer: null } });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return result?.key === key ? result.value : undefined;
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

/** "Which unit wins": one verdict per criterion, figures from the listing, location and developer from AI. */
export function CompareVerdictCard({
  projects,
  units,
}: {
  projects: [CompareProjectPayload, CompareProjectPayload];
  units: [ProjectUnit, ProjectUnit];
}) {
  const ai = useAiVerdicts([projects[0].id, projects[1].id]);
  const figures = figureVerdicts(units);
  // Rows without a verdict (missing figures, AI unavailable) are left out entirely.
  const rows: VerdictRow[] = [
    aiVerdictRow("Location", ai?.location),
    figures.totalAmount,
    figures.pricePerSqFt,
    figures.grossArea,
    aiVerdictRow("Developer", ai?.developer),
    figures.loanAmount,
  ].filter((row) => row.pending || row.winner !== null);
  const names: [string, string] = [sideName(projects[0], units[0]), sideName(projects[1], units[1])];
  const [winsA, winsB] = countWins(rows);
  const decided = rows.filter((r) => r.winner !== null).length;
  const leader = winsA === winsB ? null : winsA > winsB ? 0 : 1;
  if (!rows.length) return null;

  return (
    <div className="border-t border-zinc-200">
      <div className="border-b border-zinc-200 bg-zinc-900 px-4 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-white">Which unit wins</p>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="rounded-clay-lg bg-clay-well px-4 py-3 shadow-clay-inset">
          {decided === 0 ? (
            <p className="text-sm text-zinc-600">Checking…</p>
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
        </div>

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

        <p className="text-xs leading-relaxed text-zinc-500">
          Total amount, price per sq.ft, gross area and loan amount are worked out from the listed
          figures. Location and developer verdicts are AI opinions from general public knowledge
          and can be wrong, so check them yourself before deciding.
        </p>
      </div>
    </div>
  );
}
