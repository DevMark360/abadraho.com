"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, LayoutList, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ListingsInfiniteGrid } from "@/components/projects/listings-infinite-grid";
import { ProjectsMapPanel } from "@/components/projects/projects-map-panel";
import type { FilterSummary } from "@/lib/filter-match-tiers";
import type { ProjectListItem } from "@/types/project";

interface ListingsSplitViewProps {
  projects: ProjectListItem[];
  currency: string;
  total: number;
  filterSummary?: FilterSummary | null;
  filterQueryString: string;
  pageSize: number;
}

/**
 * Reelly split view: scrollable cards + map.
 * Mobile: map on top, list below. Desktop: side-by-side.
 */
export function ListingsSplitView({
  projects,
  currency,
  total,
  filterSummary = null,
  filterQueryString,
  pageSize,
}: ListingsSplitViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mapProjects, setMapProjects] = useState<ProjectListItem[]>(projects);
  const [selectedId, setSelectedId] = useState<number | null>(
    projects[0]?.id ?? null
  );
  const [mapCollapsed, setMapCollapsed] = useState(false);
  /** Map fills the view and the project list is hidden (full screen on phones). */
  const [mapExpanded, setMapExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!mapExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMapExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mapExpanded]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setMapProjects(projects);
    setSelectedId(projects[0]?.id ?? null);
  }, [projects]);

  const refreshMapData = useCallback(() => {
    const qs = searchParams.toString();
    return fetch(`/api/v1/projects/map-data${qs ? `?${qs}` : ""}`, {
      credentials: "same-origin",
    })
      .then((r) => r.json())
      .then((json) => {
        const mapItems = (json?.data ?? json?.projects ?? json) as ProjectListItem[] | undefined;
        if (!Array.isArray(mapItems) || !mapItems.length) return;
        setMapProjects(mapItems);
      })
      .catch(() => undefined);
  }, [searchParams]);

  useEffect(() => {
    void refreshMapData();
  }, [refreshMapData]);

  function closeMap() {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("view");
    router.push(`/projects?${p.toString()}`, { scroll: false });
  }

  return (
    <div
      className={cn(
        "listings-split-view",
        mapCollapsed && "listings-split-view--collapsed",
        mapExpanded && "listings-split-view--map-expanded"
      )}
    >
      <div className="listings-split-view__list">
        <p className="listings-split-view__count shrink-0 px-4 py-2 text-sm text-zinc-500">
          {total} projects
        </p>
        <div
          className={cn(
            "listings-split-view__cards min-h-0 flex-1 px-3 pb-4",
            isMobile ? "overflow-x-auto overflow-y-hidden" : "overflow-y-auto"
          )}
        >
          <ListingsInfiniteGrid
            initialProjects={projects}
            total={total}
            pageSize={pageSize}
            filterQueryString={filterQueryString}
            currency={currency}
            filterSummary={filterSummary}
            compact
            horizontal={isMobile}
            selectedId={selectedId}
            onHover={setSelectedId}
          />
        </div>
      </div>

      {!mapCollapsed && (
        <button
          type="button"
          onClick={() => setMapCollapsed(true)}
          className="listings-split-view__divider relative z-10 w-6 shrink-0 items-center justify-center border-r border-zinc-200 bg-white hover:bg-zinc-50"
          title="Collapse map"
          aria-label="Collapse map"
        >
          <ChevronRight className="h-4 w-4 text-zinc-500" />
        </button>
      )}

      {mapCollapsed && (
        <button
          type="button"
          onClick={() => setMapCollapsed(false)}
          className="listings-split-view__expand w-8 shrink-0 flex-col items-center justify-center border-r border-zinc-200 bg-white text-xs font-medium text-zinc-600 hover:bg-zinc-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Map
        </button>
      )}

      {!mapCollapsed && (
        <div className="listings-split-view__map">
          <ProjectsMapPanel
            projects={mapProjects}
            selectedId={selectedId}
            onRefreshMapData={refreshMapData}
            onSelect={(id) => {
              setSelectedId(id);
              document
                .getElementById(`project-card-${id}`)
                ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
          />
          {/* Phones: the small map is a preview; the first tap opens it full screen. */}
          {isMobile && !mapExpanded ? (
            <button
              type="button"
              onClick={() => setMapExpanded(true)}
              className="absolute inset-0 z-[1001] flex items-end justify-center pb-3"
              aria-label="Expand map"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900/85 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                <Maximize2 className="h-3.5 w-3.5" aria-hidden />
                Tap to expand map
              </span>
            </button>
          ) : null}

          <div className="absolute left-2 top-2 z-[1002] flex gap-2 sm:left-3 sm:top-3">
            {mapExpanded ? (
              <button
                type="button"
                onClick={() => setMapExpanded(false)}
                className={mapButtonClass("bg-zinc-900 text-white hover:bg-zinc-800 border-zinc-900")}
              >
                <LayoutList className="h-4 w-4" aria-hidden />
                Show projects
              </button>
            ) : (
              <>
                <button type="button" onClick={closeMap} className={mapButtonClass()}>
                  List only
                </button>
                <button
                  type="button"
                  onClick={() => setMapExpanded(true)}
                  className={mapButtonClass()}
                  title="Expand map"
                >
                  <Maximize2 className="h-4 w-4" aria-hidden />
                  Expand map
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function mapButtonClass(tone = "bg-white text-zinc-800 hover:bg-zinc-50 border-zinc-200") {
  return cn(
    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-sm",
    "sm:min-h-[44px] sm:px-3 sm:py-2 sm:text-sm",
    tone
  );
}
