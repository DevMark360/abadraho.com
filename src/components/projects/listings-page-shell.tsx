"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/ui/loading-state";
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
    <>
      <FilterChipsBar />
      <div
        className={
          isMapView
            ? "flex min-h-0 flex-1 flex-col overflow-hidden"
            : "flex min-h-0 flex-1 flex-col"
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
    </>
  );
}

export function ListingsPageShell(props: ListingsPageShellProps) {
  return (
    <Suspense fallback={<LoadingState size="lg" fullHeight className="flex-1" />}>
      <ListingsPageShellInner {...props} />
    </Suspense>
  );
}
