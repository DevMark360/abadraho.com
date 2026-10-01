"use client";

import { useCallback, useEffect, useState } from "react";
import { ProjectsMapPanel } from "@/components/projects/projects-map-panel";
import { homeCardClass } from "@/components/marketing/home-ui";
import { cn } from "@/lib/utils";
import type { ProjectListItem } from "@/types/project";

export function HomeProjectsMap({ projects: initialProjects }: { projects: ProjectListItem[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mapProjects, setMapProjects] = useState<ProjectListItem[]>(initialProjects);

  const refreshMapData = useCallback(() => {
    return fetch("/api/v1/projects/map-data", { credentials: "same-origin" })
      .then((r) => r.json())
      .then((json) => {
        const mapItems = json?.data as ProjectListItem[] | undefined;
        if (Array.isArray(mapItems) && mapItems.length) {
          setMapProjects(mapItems);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setMapProjects(initialProjects);
  }, [initialProjects]);

  useEffect(() => {
    void refreshMapData();
  }, [refreshMapData]);

  return (
    <div className={cn(homeCardClass, "overflow-hidden p-0")}>
      <div className="border-b border-zinc-100 px-6 py-4">
        <h3 className="text-lg font-semibold text-zinc-900">Project map</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Explore off-plan listings across Karachi
        </p>
      </div>
      <ProjectsMapPanel
        projects={mapProjects}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onRefreshMapData={refreshMapData}
        className="h-[320px] rounded-none border-0 sm:h-[380px] lg:h-[420px]"
      />
    </div>
  );
}
