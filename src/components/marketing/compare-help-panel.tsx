"use client";

import { GeoPageSummary } from "@/components/marketing/geo-page-summary";
import { geoContent } from "@/config/geo-content";

export function CompareHelpPanel({ className }: { className?: string }) {
  return (
    <GeoPageSummary
      variant="accordion"
      compact
      className={className}
      summary={geoContent.compare.summary}
      bullets={geoContent.compare.bullets}
      factsToggleLabel="How to compare"
      collapseSummaryOnMobile
    />
  );
}
