"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GroupedProjectGrid } from "@/components/projects/grouped-project-grid";
import { LoadingState } from "@/components/ui/loading-state";
import { Button } from "@/components/ui/button";
import { uniqueById } from "@/lib/unique-by-id";
import type { FilterSummary } from "@/lib/filter-match-tiers";
import type { ProjectListItem } from "@/types/project";

type ListingsInfiniteGridProps = {
  initialProjects: ProjectListItem[];
  total: number;
  pageSize: number;
  filterQueryString: string;
  currency?: string;
  filterSummary?: FilterSummary | null;
  emptyMessage?: string;
  selectedId?: number | null;
  onHover?: (id: number) => void;
  compact?: boolean;
  horizontal?: boolean;
};

export function ListingsInfiniteGrid({
  initialProjects,
  total,
  pageSize,
  filterQueryString,
  currency = "PKR",
  filterSummary = null,
  emptyMessage,
  selectedId,
  onHover,
  compact,
  horizontal,
}: ListingsInfiniteGridProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = projects.length < total;

  useEffect(() => {
    setProjects(initialProjects);
    setPage(1);
  }, [initialProjects, filterQueryString]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;

    try {
      const params = new URLSearchParams(filterQueryString);
      params.set("page", String(nextPage));
      params.set("perPage", String(pageSize));
      const res = await fetch(`/api/v1/projects?${params.toString()}`, {
        credentials: "same-origin",
      });
      const json = await res.json();
      const batch = (json?.data ?? []) as ProjectListItem[];
      if (Array.isArray(batch) && batch.length) {
        setProjects((prev) => uniqueById([...prev, ...batch]));
        setPage(nextPage);
      }
    } catch {
      /* ignore — user can retry via button */
    } finally {
      setLoading(false);
    }
  }, [filterQueryString, hasMore, loading, page, pageSize]);

  useEffect(() => {
    if (!hasMore || horizontal) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "240px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, horizontal, loadMore]);

  return (
    <>
      <GroupedProjectGrid
        projects={projects}
        currency={currency}
        summary={filterSummary}
        emptyMessage={emptyMessage}
        selectedId={selectedId}
        onHover={onHover}
        compact={compact}
        horizontal={horizontal}
      />

      {!horizontal && total > 0 ? (
        <p className="mt-4 text-center text-sm text-zinc-500">
          Showing {projects.length.toLocaleString()} of {total.toLocaleString()} projects
        </p>
      ) : null}

      {!horizontal && hasMore ? (
        <div ref={sentinelRef} className="flex flex-col items-center gap-3 py-8">
          {loading ? (
            <LoadingState size="sm" label="Loading more projects…" />
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => void loadMore()}>
              Load more
            </Button>
          )}
        </div>
      ) : null}
    </>
  );
}
