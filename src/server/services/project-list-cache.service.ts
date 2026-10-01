import { unstable_cache } from "next/cache";
import type { ProjectFilters } from "@/types/project";
import { listProjects } from "@/server/services/project.service";

/** Cache identical filter combinations briefly to speed repeat /projects loads. */
const LISTINGS_CACHE_SECONDS = 120;

function stableFilterKey(filters: ProjectFilters): string {
  const entries = Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}

export async function listProjectsCached(filters: ProjectFilters) {
  const key = stableFilterKey(filters);

  return unstable_cache(
    () => listProjects(filters),
    ["list-projects", key],
    {
      revalidate: LISTINGS_CACHE_SECONDS,
      tags: ["projects-list"],
    }
  )();
}
