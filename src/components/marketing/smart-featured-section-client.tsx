"use client";

import dynamic from "next/dynamic";
import { FeaturedSectionSkeleton } from "@/components/marketing/featured-section-skeleton";
import type { ProjectListItem } from "@/types/project";

const SmartFeaturedSection = dynamic(
  () =>
    import("@/components/marketing/smart-featured-section").then(
      (mod) => mod.SmartFeaturedSection
    ),
  { ssr: false, loading: () => <FeaturedSectionSkeleton /> }
);

export function SmartFeaturedSectionClient({
  defaultProjects,
}: {
  defaultProjects: ProjectListItem[];
}) {
  return <SmartFeaturedSection defaultProjects={defaultProjects} />;
}
