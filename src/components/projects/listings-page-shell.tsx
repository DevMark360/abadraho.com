"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { FilterChipsBar } from "@/components/projects/filter-chips-bar";
import { ListingsSeoFooter } from "@/components/marketing/listings-seo-footer";
import { ListingsContent } from "@/components/projects/listings-content";
import type { RotationSlot } from "@/server/services/ad-serving.service";
import type { FilterSummary } from "@/lib/filter-match-tiers";
import type { ProjectListItem } from "@/types/project";

type ListingsPageShellProps = {
  projects: ProjectListItem[];
  currency: string;
  total: number;
  source?: string;
  filterSummary?: FilterSummary | null;
  filterKey: string;
  filterQueryString: string;
  pageSize: number;
  featuredRotation?: RotationSlot[];
  bannerRotation?: RotationSlot[];
  contentRotation?: RotationSlot[];
};

function ListingsPageShellInner({
  projects,
  currency,
  total,
  source,
  filterSummary,
  filterKey,
  filterQueryString,
  pageSize,
  featuredRotation,
  bannerRotation,
  contentRotation,
}: ListingsPageShellProps) {
  const searchParams = useSearchParams();
  const isMapView = searchParams.get("view") === "map";

  return (
    // One scroll area for filters + results. Previously only the results scrolled, squeezed
    // between the filter panel and the footer strip — on phones that left room for barely one
    // card. Desktop keeps the filters pinned (sticky); the desktop map view keeps its fixed
    // split layout, while on phones the map view scrolls like the list.
    <div
      className={
        isMapView
          ? "flex min-h-0 flex-1 flex-col overflow-y-auto md:overflow-hidden"
          : "flex min-h-0 flex-1 flex-col overflow-y-auto"
      }
    >
      <div className={cn("shrink-0", !isMapView && "bg-clay-canvas lg:sticky lg:top-0 lg:z-20 lg:pb-1")}>
        <FilterChipsBar />
      </div>
      <div
        className={
          isMapView
            ? "flex flex-col md:min-h-0 md:flex-1 md:overflow-hidden"
            : "flex flex-1 flex-col" /* keeps the SEO strip at the bottom when results are short */
        }
      >
        <ListingsContent
          key={filterKey}
          projects={projects}
          currency={currency}
          total={total}
          source={source}
          filterSummary={filterSummary}
          filterQueryString={filterQueryString}
          pageSize={pageSize}
          featuredRotation={featuredRotation}
          bannerRotation={bannerRotation}
          contentRotation={contentRotation}
        />
        {!isMapView ? <ListingsSeoFooter /> : null}
      </div>
    </div>
  );
}

export function ListingsPageShell(props: ListingsPageShellProps) {
  return (
    <Suspense fallback={<LoadingState size="lg" fullHeight className="flex-1" />}>
      <ListingsPageShellInner {...props} />
    </Suspense>
  );
}
