import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  normalizeBuilderRatingDistribution,
  type BuilderRatingDistribution,
} from "@/lib/builder-rating";

export function BuilderStarRow({
  value,
  size = "md",
  className,
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const iconClass =
    size === "lg" ? "h-6 w-6" : size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            iconClass,
            n <= Math.round(value)
              ? "fill-amber-400 text-amber-400"
              : n - 0.5 <= value
                ? "fill-amber-200 text-amber-400"
                : "text-zinc-300"
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function BuilderRatingDistributionChart({
  distribution,
  total,
}: {
  distribution?: Partial<BuilderRatingDistribution> | null;
  total: number;
}) {
  const safe = normalizeBuilderRatingDistribution(distribution);
  return (
    <div className="space-y-2">
      {([5, 4, 3, 2, 1] as const).map((stars) => {
        const count = safe[stars];
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={stars} className="flex items-center gap-3 text-sm">
            <span className="w-3 shrink-0 font-medium text-zinc-600">{stars}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-amber-400 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs text-zinc-500">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export function BuilderProfileRating({
  average,
  count,
  size = "hero",
}: {
  average: number;
  count: number;
  size?: "hero" | "compact" | "profile";
}) {
  if (size === "compact") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg font-bold text-zinc-900">{average.toFixed(1)}</span>
        <BuilderStarRow value={average} size="sm" />
        <span className="text-sm text-zinc-500">
          based on {count} review{count === 1 ? "" : "s"}
        </span>
      </div>
    );
  }

  if (size === "profile") {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm lg:min-w-[220px]">
        <div className="flex items-end gap-2">
          <span className="text-4xl font-bold leading-none text-zinc-900">
            {count > 0 ? average.toFixed(1) : "—"}
          </span>
          {count > 0 ? (
            <BuilderStarRow value={average} size="lg" className="mb-1" />
          ) : null}
        </div>
        <p className="mt-2 text-sm font-medium text-zinc-600">
          {count > 0
            ? `Based on ${count} review${count === 1 ? "" : "s"}`
            : "No reviews yet — be the first"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-md lg:min-w-[220px]">
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold leading-none text-white drop-shadow-sm">
          {count > 0 ? average.toFixed(1) : "—"}
        </span>
        {count > 0 ? (
          <BuilderStarRow value={average} size="lg" className="mb-1" />
        ) : null}
      </div>
      <p className="mt-2 text-sm font-medium text-white/90">
        {count > 0
          ? `Based on ${count} review${count === 1 ? "" : "s"}`
          : "No reviews yet — be the first"}
      </p>
    </div>
  );
}
