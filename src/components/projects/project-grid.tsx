import { ListingsInfiniteGrid } from "@/components/projects/listings-infinite-grid";
import type { FilterSummary } from "@/lib/filter-match-tiers";
import type { ProjectListItem } from "@/types/project";

interface ProjectGridProps {
  projects: ProjectListItem[];
  currency?: string;
  emptyMessage?: string;
  filterSummary?: FilterSummary | null;
  total?: number;
  pageSize?: number;
  filterQueryString?: string;
  selectedId?: number | null;
  onHover?: (id: number) => void;
  compact?: boolean;
  horizontal?: boolean;
}

/** Reelly 4-column card grid with optional priority tiers + infinite scroll. */
export function ProjectGrid({
  projects,
  currency = "PKR",
  emptyMessage = "No projects match your filters.",
  filterSummary = null,
  total = projects.length,
  pageSize = projects.length || 36,
  filterQueryString = "",
  selectedId,
  onHover,
  compact,
  horizontal,
}: ProjectGridProps) {
  return (
    <ListingsInfiniteGrid
      initialProjects={projects}
      total={total}
      pageSize={pageSize}
      filterQueryString={filterQueryString}
      currency={currency}
      filterSummary={filterSummary}
      emptyMessage={emptyMessage}
      selectedId={selectedId}
      onHover={onHover}
      compact={compact}
      horizontal={horizontal}
    />
  );
}
