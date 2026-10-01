import type { FilterKey } from "@/lib/filter-match-tiers";
import { filterKeyLabel } from "@/lib/filter-match-tiers";
import type { ProjectListItem } from "@/types/project";

function representativeFilters(
  projects: ProjectListItem[],
  pick: (p: ProjectListItem) => FilterKey[] | undefined
): FilterKey[] {
  const lists = projects
    .map((p) => pick(p) ?? [])
    .filter((list) => list.length > 0);
  if (!lists.length) return [];

  const shared = lists[0].filter((key) => lists.every((list) => list.includes(key)));
  if (shared.length) return shared;
  return pick(projects[0]) ?? [];
}

export function MatchFilterChips({ projects }: { projects: ProjectListItem[] }) {
  const matched = representativeFilters(projects, (p) => p.matchedFilters);
  const missing = representativeFilters(projects, (p) => p.matchFailedFilters);

  if (!matched.length && !missing.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {matched.length > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800">
          <span aria-hidden>✅</span>
          Matched: {matched.map(filterKeyLabel).join(", ")}
        </span>
      )}
      {missing.length > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-800">
          <span aria-hidden>❌</span>
          Missing: {missing.map(filterKeyLabel).join(", ")}
        </span>
      )}
    </div>
  );
}
