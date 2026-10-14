import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shape returned by /api/v1/compare/analysis. */
export type CompareAnalysis = {
  winner: "first" | "second" | "depends";
  summary: string;
  financial: string[];
  space: string[];
  locationDeveloper: string[];
  chooseFirst: string;
  chooseSecond: string;
};

export type AnalysisState =
  | { status: "loading" }
  | { status: "done"; analysis: CompareAnalysis }
  | { status: "error"; message: string };

const SIDE_DOT = ["bg-brand-accent", "bg-zinc-900"] as const;

function Dot({ side, className }: { side: 0 | 1; className?: string }) {
  return <span aria-hidden className={cn("inline-block shrink-0 rounded-full", SIDE_DOT[side], className)} />;
}

function TradeOff({ title, points }: { title: string; points: string[] }) {
  if (!points.length) return null;
  return (
    <div>
      <h5 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h5>
      <ul className="mt-2 space-y-2">
        {points.map((point, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-zinc-700">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChooseCallout({ side, name, condition }: { side: 0 | 1; name: string; condition: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border-l-4 bg-clay-well px-4 py-3 shadow-clay-inset",
        side === 0 ? "border-brand-accent" : "border-zinc-900"
      )}
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
        <Dot side={side} className="h-2.5 w-2.5" />
        Choose {name} if
      </p>
      <p className="mt-1 text-sm leading-relaxed text-zinc-700">{condition}</p>
    </div>
  );
}

/** The AI's written comparison, shown under the score rows once "Which unit wins?" is clicked. */
export function CompareAnalysisBox({
  state,
  names,
  purposeLabel,
}: {
  state: AnalysisState;
  names: [string, string];
  purposeLabel: string;
}) {
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
        {state.status === "done" && state.analysis.winner !== "depends" ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-800">
            <Dot side={state.analysis.winner === "first" ? 0 : 1} className="h-2 w-2" />
            Leans to {names[state.analysis.winner === "first" ? 0 : 1]}
          </span>
        ) : null}
      </header>

      {state.status === "loading" ? (
        <div className="space-y-3 px-4 py-5 sm:px-5">
          <p className="flex items-center gap-2 text-sm text-zinc-600">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Writing the analysis…
          </p>
          <div className="space-y-2" aria-hidden>
            <div className="h-3 w-11/12 animate-pulse rounded bg-zinc-100" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-zinc-100" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-100" />
          </div>
        </div>
      ) : state.status === "error" ? (
        <p className="px-4 py-5 text-sm text-zinc-600 sm:px-5">
          {state.message} Click &ldquo;Which unit wins?&rdquo; to try again.
        </p>
      ) : (
        <div className="space-y-5 px-4 py-5 sm:px-5">
          <p className="text-base font-semibold leading-relaxed text-zinc-900">{state.analysis.summary}</p>

          <div>
            <h4 className="text-sm font-bold text-zinc-900">Key trade-offs</h4>
            <div className="mt-3 grid gap-5 md:grid-cols-3 md:gap-6">
              <TradeOff title="Budget impact" points={state.analysis.financial} />
              <TradeOff title="Space & value" points={state.analysis.space} />
              <TradeOff title="Location & developer" points={state.analysis.locationDeveloper} />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-zinc-900">Which one is right for you</h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <ChooseCallout side={0} name={names[0]} condition={state.analysis.chooseFirst} />
              <ChooseCallout side={1} name={names[1]} condition={state.analysis.chooseSecond} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
