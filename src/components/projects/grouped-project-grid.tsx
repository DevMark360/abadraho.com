"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProjectCard } from "@/components/projects/project-card";
import { FilterTierAdjustButton } from "@/components/projects/filter-tier-adjust-button";
import { MatchFilterChips } from "@/components/projects/match-filter-chips";
import { useFilterSummaryFromUrl } from "@/components/projects/use-filter-summary";
import {
  getMatchQualityTier,
  suggestFilterMax,
  type FilterSummary,
  type MatchQualityTier,
  type TierSectionMeta,
} from "@/lib/filter-match-tiers";
import { uniqueById } from "@/lib/unique-by-id";
import { LISTINGS_PAGE_SIZE } from "@/lib/pagination";
import type { ProjectListItem } from "@/types/project";

function FilterSummaryBanner({ summary }: { summary: FilterSummary }) {
  if (summary.count < 2) return null;

  return (
    <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <p className="text-sm font-semibold text-zinc-900">
        {summary.count} filters applied
      </p>
      <p className="mt-1 text-xs text-zinc-600">{summary.labels.join(", ")}</p>
    </div>
  );
}

function ProjectCardWrap({
  project,
  currency,
  selectedId,
  onHover,
}: {
  project: ProjectListItem;
  currency: string;
  selectedId?: number | null;
  onHover?: (id: number) => void;
}) {
  return (
    <div
      key={project.id}
      id={`project-card-${project.id}`}
      className="transition-all duration-300 ease-in-out"
      onMouseEnter={() => onHover?.(project.id)}
      onFocus={() => onHover?.(project.id)}
    >
      <ProjectCard
        project={project}
        currency={currency}
        selected={selectedId === project.id}
      />
    </div>
  );
}

function ScoreSection({
  section,
  projects,
  currency,
  selectedId,
  onHover,
  showFilterChips = false,
}: {
  section: TierSectionMeta;
  projects: ProjectListItem[];
  currency: string;
  selectedId?: number | null;
  onHover?: (id: number) => void;
  showFilterChips?: boolean;
}) {
  if (!projects.length) return null;

  const suggested =
    section.filterAdjust != null
      ? suggestFilterMax(projects, section.filterAdjust.param)
      : null;

  return (
    <section className="mb-8">
      <div className="mb-4 border-b border-zinc-100 pb-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-zinc-900">{section.title}</h2>
          <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </span>
        </div>
        {showFilterChips && <MatchFilterChips projects={projects} />}
        {section.filterAdjust && (
          <FilterTierAdjustButton
            hint={section.filterAdjust}
            suggestedValue={suggested}
            currency={currency}
          />
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {projects.map((project) => (
          <ProjectCardWrap
            key={project.id}
            project={project}
            currency={currency}
            selectedId={selectedId}
            onHover={onHover}
          />
        ))}
      </div>
    </section>
  );
}

export function GroupedProjectGrid({
  projects,
  currency = "PKR",
  summary: serverSummary = null,
  emptyMessage = "No projects match your filters.",
  selectedId,
  onHover,
  compact = false,
  horizontal = false,
}: {
  projects: ProjectListItem[];
  currency?: string;
  summary?: FilterSummary | null;
  emptyMessage?: string;
  selectedId?: number | null;
  onHover?: (id: number) => void;
  compact?: boolean;
  /** Mobile map view — swipeable card strip */
  horizontal?: boolean;
}) {
  const searchParams = useSearchParams();
  const urlSummary = useFilterSummaryFromUrl();
  const summary =
    urlSummary.useTiers || urlSummary.count >= 2 ? urlSummary : serverSummary;

  const [scoredProjects, setScoredProjects] = useState(projects);
  useEffect(() => {
    setScoredProjects(projects);
  }, [projects]);

  const needsScoreRefresh = useMemo(
    () =>
      (summary?.useTiers ?? false) &&
      projects.length > 0 &&
      projects.every((p) => p.matchScore == null),
    [summary?.useTiers, projects]
  );

  useEffect(() => {
    if (!needsScoreRefresh) return;
    const qs = searchParams.toString();
    fetch(`/api/v1/projects?${qs}${qs ? "&" : ""}perPage=${LISTINGS_PAGE_SIZE}&page=1`, {
      credentials: "same-origin",
    })
      .then((r) => r.json())
      .then((json) => {
        const fresh = json?.data as ProjectListItem[] | undefined;
        if (!Array.isArray(fresh) || !fresh.length) return;
        const scoreById = new Map(fresh.map((p) => [p.id, p]));
        const updated: ProjectListItem[] = [];
        for (const p of projects) {
          const hit = scoreById.get(p.id);
          if (!hit?.matchScore) continue;
          updated.push({
            ...p,
            matchScore: hit.matchScore,
            totalActiveFilters: hit.totalActiveFilters,
            matchedUnit: hit.matchedUnit ?? null,
            matchFailedFilters: hit.matchFailedFilters ?? p.matchFailedFilters,
            matchedFilters: hit.matchedFilters ?? p.matchedFilters,
          });
        }
        updated.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
        setScoredProjects(updated);
      })
      .catch(() => {});
  }, [needsScoreRefresh, searchParams, projects]);

  const displayProjects = uniqueById(scoredProjects);

  if (displayProjects.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white p-10 text-center">
        <p className="font-medium text-zinc-700">{emptyMessage}</p>
        <p className="mt-1 text-sm text-zinc-400">Use Search & filters above.</p>
      </div>
    );
  }

  const useScoreSections = summary?.useTiers ?? false;

  if (horizontal) {
    return (
      <div className="listings-map-strip flex gap-3 overflow-x-auto px-1 pb-1 scrollbar-none snap-x snap-mandatory">
        {displayProjects.map((project) => (
          <div key={project.id} className="w-[min(82vw,280px)] shrink-0 snap-start">
            <ProjectCardWrap
              project={project}
              currency={currency}
              selectedId={selectedId}
              onHover={onHover}
            />
          </div>
        ))}
      </div>
    );
  }

  if (!useScoreSections || !summary?.tierSections.length) {
    const gridClass = horizontal
      ? "listings-map-strip flex gap-3 overflow-x-auto px-1 pb-1 scrollbar-none snap-x snap-mandatory"
      : compact
        ? "grid grid-cols-1 gap-3 sm:grid-cols-2"
        : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";

    return (
      <>
        {summary && summary.count >= 2 && !horizontal && (
          <FilterSummaryBanner summary={summary} />
        )}
        <div className={gridClass}>
          {displayProjects.map((project) => (
            <div
              key={project.id}
              className={horizontal ? "w-[min(82vw,280px)] shrink-0 snap-start" : undefined}
            >
              <ProjectCardWrap
                project={project}
                currency={currency}
                selectedId={selectedId}
                onHover={onHover}
              />
            </div>
          ))}
        </div>
      </>
    );
  }

  const sectionsWithProjects = summary.tierSections
    .map((section) => {
      const tier = section.id as MatchQualityTier;
      const bucket = displayProjects.filter(
        (p) =>
          p.matchScore != null &&
          p.totalActiveFilters != null &&
          getMatchQualityTier(p.matchScore, p.totalActiveFilters) === tier
      );
      return { section, projects: bucket };
    })
    .filter((entry) => entry.projects.length > 0);

  return (
    <>
      {summary.count >= 2 && <FilterSummaryBanner summary={summary} />}
      {sectionsWithProjects.map(({ section, projects: bucket }) => (
        <ScoreSection
          key={section.id}
          section={section}
          projects={bucket}
          currency={currency}
          selectedId={selectedId}
          onHover={onHover}
          showFilterChips={section.id !== "perfect"}
        />
      ))}
    </>
  );
}
