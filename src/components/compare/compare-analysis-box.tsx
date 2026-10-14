import type { ReactNode } from "react";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Side = "first" | "second";

export type CompareCriterion = {
  name: string;
  weight: "high" | "medium" | "low";
  edge: Side | "even";
  note: string;
};

/** Shape returned by /api/v1/compare/analysis (fields after chooseSecond can be missing). */
export type CompareAnalysis = {
  winner: Side | "depends";
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

export type AnalysisState =
  | { status: "loading" }
  | { status: "done"; analysis: CompareAnalysis }
  | { status: "error"; message: string };

const SIDE_DOT = ["bg-brand-accent", "bg-zinc-900"] as const;
const SIDE_BORDER = ["border-brand-accent", "border-zinc-900"] as const;
const sideIndex = (side: Side): 0 | 1 => (side === "first" ? 0 : 1);

const WEIGHT_LABEL = { high: "Matters most", medium: "Matters", low: "Minor" } as const;
const WEIGHT_BARS = { high: 3, medium: 2, low: 1 } as const;
const CONFIDENCE_LABEL = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" } as const;

function Dot({ side, className }: { side: 0 | 1; className?: string }) {
  return <span aria-hidden className={cn("inline-block shrink-0 rounded-full", SIDE_DOT[side], className)} />;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h4 className="text-sm font-bold text-zinc-900">{children}</h4>;
}

function Points({ points, className }: { points: string[]; className?: string }) {
  return (
    <ul className={cn("space-y-2", className)}>
      {points.map((point, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed text-zinc-700">
          <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
          <span>{point}</span>
        </li>
      ))}
    </ul>
  );
}

function TradeOff({ title, points }: { title: string; points: string[] | undefined }) {
  if (!points?.length) return null;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <h5 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h5>
      <Points points={points} className="mt-2" />
    </div>
  );
}

function WeightBars({ weight }: { weight: CompareCriterion["weight"] }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
      <span aria-hidden className="inline-flex items-end gap-0.5">
        {[1, 2, 3].map((bar) => (
          <span
            key={bar}
            className={cn(
              "w-1 rounded-sm",
              bar === 1 ? "h-1.5" : bar === 2 ? "h-2.5" : "h-3.5",
              bar <= WEIGHT_BARS[weight] ? "bg-zinc-700" : "bg-zinc-200"
            )}
          />
        ))}
      </span>
      {WEIGHT_LABEL[weight]}
    </span>
  );
}

function Scorecard({ criteria, names }: { criteria: CompareCriterion[]; names: [string, string] }) {
  return (
    <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white">
      {criteria.map((c, i) => (
        <li
          key={`${c.name}-${i}`}
          className="grid gap-1.5 px-4 py-3 sm:grid-cols-[minmax(0,170px)_minmax(0,220px)_minmax(0,1fr)] sm:items-center sm:gap-4"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900">{c.name}</p>
            <WeightBars weight={c.weight} />
          </div>
          <p className="min-w-0 text-sm">
            {c.edge === "even" ? (
              <span className="font-semibold text-zinc-600">Even</span>
            ) : (
              <span className="flex min-w-0 items-center gap-2 font-semibold text-zinc-900">
                <Dot side={sideIndex(c.edge)} className="h-2.5 w-2.5" />
                <span className="truncate" title={names[sideIndex(c.edge)]}>
                  {names[sideIndex(c.edge)]}
                </span>
              </span>
            )}
          </p>
          <p className="text-sm leading-relaxed text-zinc-600">{c.note}</p>
        </li>
      ))}
    </ul>
  );
}

function ChooseCallout({ side, name, condition }: { side: 0 | 1; name: string; condition: string }) {
  return (
    <div className={cn("rounded-xl border-l-4 bg-clay-well px-4 py-3 shadow-clay-inset", SIDE_BORDER[side])}>
      <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
        <Dot side={side} className="h-2.5 w-2.5" />
        Choose {name} if
      </p>
      <p className="mt-1 text-sm leading-relaxed text-zinc-700">{condition}</p>
    </div>
  );
}

/** The winner, the purpose-weighted tally and the AI's one-line verdict. */
function WinnerBanner({
  analysis,
  names,
  purposeLabel,
}: {
  analysis: CompareAnalysis;
  names: [string, string];
  purposeLabel: string;
}) {
  const winner = analysis.winner === "depends" ? null : sideIndex(analysis.winner);
  const criteria = analysis.criteria ?? [];
  const decided = criteria.filter((c) => c.edge !== "even");
  const ahead = winner === null ? 0 : decided.filter((c) => sideIndex(c.edge as Side) === winner).length;
  const keyAhead =
    winner === null
      ? 0
      : criteria.filter((c) => c.weight === "high" && c.edge !== "even" && sideIndex(c.edge) === winner).length;
  const keyTotal = criteria.filter((c) => c.weight === "high").length;

  return (
    <div
      className={cn(
        "rounded-clay-lg border-l-4 bg-clay-well px-4 py-4 shadow-clay-inset sm:px-5",
        winner === null ? "border-zinc-300" : SIDE_BORDER[winner]
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {winner === null ? "No clear winner" : `Best for ${purposeLabel}`}
      </p>
      {winner !== null ? (
        <p className="mt-1 flex items-start gap-2.5 text-lg font-bold leading-snug text-zinc-900 sm:text-xl">
          <Dot side={winner} className="mt-2 h-3 w-3" />
          <span className="min-w-0 break-words">{names[winner]}</span>
        </p>
      ) : null}
      {winner !== null && decided.length ? (
        <p className="mt-1.5 text-sm text-zinc-600">
          Ahead on <strong className="text-zinc-900">{ahead}</strong> of {criteria.length} criteria
          {keyTotal ? (
            <>
              {", "}
              <strong className="text-zinc-900">{keyAhead}</strong> of {keyTotal} that matter most for this purpose
            </>
          ) : null}
          .
        </p>
      ) : null}
      <p className="mt-3 text-base font-medium leading-relaxed text-zinc-800">{analysis.summary}</p>
    </div>
  );
}

function LoadingBody() {
  return (
    <div className="space-y-4 px-4 py-5 sm:px-5">
      <p className="flex items-center gap-2 text-sm text-zinc-600">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Comparing prices, payment plans, rooms and locations…
      </p>
      <div aria-hidden className="space-y-3">
        <div className="h-24 animate-pulse rounded-clay-lg bg-zinc-100" />
        <div className="space-y-2">
          <div className="h-3 w-11/12 animate-pulse rounded bg-zinc-100" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-zinc-100" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="h-32 animate-pulse rounded-xl bg-zinc-100" />
      </div>
    </div>
  );
}

/** The AI's written comparison, shown once "Which unit wins?" is clicked. */
export function CompareAnalysisBox({
  state,
  names,
  purposeLabel,
  onRetry,
}: {
  state: AnalysisState;
  names: [string, string];
  purposeLabel: string;
  onRetry?: () => void;
}) {
  const analysis = state.status === "done" ? state.analysis : null;
  const loser = analysis && analysis.winner !== "depends" ? (analysis.winner === "first" ? 1 : 0) : null;

  return (
    <section
      aria-live="polite"
      aria-busy={state.status === "loading"}
      className="overflow-hidden rounded-clay-lg border border-zinc-200 bg-white shadow-clay"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3 sm:px-5">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-accent">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            AI recommendation
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">For {purposeLabel}</p>
        </div>
        {analysis?.confidence ? (
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
            {CONFIDENCE_LABEL[analysis.confidence]}
          </span>
        ) : null}
      </header>

      {state.status === "loading" ? (
        <LoadingBody />
      ) : state.status === "error" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-5">
          <p className="text-sm text-zinc-600">{state.message}</p>
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetry} className="gap-2">
              <RotateCcw className="h-4 w-4" aria-hidden />
              Try again
            </Button>
          ) : null}
        </div>
      ) : analysis ? (
        <div className="space-y-6 px-4 py-5 sm:px-5">
          <WinnerBanner analysis={analysis} names={names} purposeLabel={purposeLabel} />

          {analysis.reasons?.length ? (
            <div>
              <SectionTitle>Why it wins</SectionTitle>
              <ol className="mt-3 space-y-2.5">
                {analysis.reasons.map((reason, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed text-zinc-700">
                    <span aria-hidden className="w-4 shrink-0 text-right font-bold text-brand-accent">
                      {i + 1}
                    </span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {analysis.criteria?.length ? (
            <div>
              <SectionTitle>How they compare for {purposeLabel.toLowerCase()}</SectionTitle>
              <p className="mt-0.5 text-xs text-zinc-500">Most important first.</p>
              <div className="mt-3">
                <Scorecard criteria={analysis.criteria} names={names} />
              </div>
            </div>
          ) : null}

          <div>
            <SectionTitle>Key trade-offs</SectionTitle>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <TradeOff title="Budget impact" points={analysis.financial} />
              <TradeOff title="Space & value" points={analysis.space} />
              <TradeOff title="Room layout" points={analysis.layout} />
              <TradeOff title="Location & developer" points={analysis.locationDeveloper} />
            </div>
          </div>

          {analysis.otherAdvantages?.length ? (
            <div>
              <SectionTitle>
                {loser !== null ? `Where ${names[loser]} is stronger` : "Other advantages"}
              </SectionTitle>
              <Points points={analysis.otherAdvantages} className="mt-3" />
            </div>
          ) : null}

          {analysis.warnings?.length ? (
            <div className="rounded-xl border border-zinc-200 border-l-4 border-l-brand-accent bg-white px-4 py-3">
              <h4 className="text-sm font-bold text-zinc-900">Check before deciding</h4>
              <Points points={analysis.warnings} className="mt-2" />
            </div>
          ) : null}

          <div>
            <SectionTitle>Which one is right for you</SectionTitle>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <ChooseCallout side={0} name={names[0]} condition={analysis.chooseFirst} />
              <ChooseCallout side={1} name={names[1]} condition={analysis.chooseSecond} />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
