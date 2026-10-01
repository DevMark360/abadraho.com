"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/ui/loading-state";
import { ProjectGrid } from "@/components/projects/project-grid";
import {
  RotatingFeaturedSection,
  RotatingBannerSection,
  RotatingContentSection,
} from "@/components/advertising/ad-rotation";
import type { RotationSlot } from "@/server/services/ad-serving.service";
import type { FilterSummary } from "@/lib/filter-match-tiers";
import type { ProjectListItem } from "@/types/project";

const ListingsSplitView = dynamic(
  () =>
    import("@/components/projects/listings-split-view").then(
      (mod) => mod.ListingsSplitView
    ),
  {
    ssr: false,
    loading: () => <LoadingState size="lg" fullHeight className="flex-1" />,
  }
);
interface ListingsContentProps {
  projects: ProjectListItem[];
  currency: string;
  total: number;
  source?: string;
  filterSummary?: FilterSummary | null;
  filterQueryString: string;
  pageSize: number;
  featuredRotation?: RotationSlot[];
  bannerRotation?: RotationSlot[];
  contentRotation?: RotationSlot[];
}

export function ListingsContent({
  projects,
  currency,
  total,
  source,
  filterSummary = null,
  filterQueryString,
  pageSize,
  featuredRotation,
  bannerRotation,
  contentRotation,
}: ListingsContentProps) {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");

  if (view === "map") {
    return (
      <ListingsSplitView
        projects={projects}
        currency={currency}
        total={total}
        filterSummary={filterSummary}
        filterQueryString={filterQueryString}
        pageSize={pageSize}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-6">
      {source === "mock" && (
        <p className="mb-3 text-xs text-amber-600">Demo data — connect MySQL for live listings.</p>
      )}
      <RotatingFeaturedSection rotation={featuredRotation ?? []} />
      <RotatingBannerSection rotation={bannerRotation ?? []} />
      <RotatingContentSection rotation={contentRotation ?? []} />
      <ProjectGrid
        projects={projects}
        currency={currency}
        total={total}
        filterSummary={filterSummary}
        filterQueryString={filterQueryString}
        pageSize={pageSize}
      />
    </div>
  );
}
