"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { buildFilterSummary } from "@/lib/filter-match-tiers";
import { parseProjectFilters } from "@/lib/project-filter-params";

export function useFilterSummaryFromUrl() {
  const searchParams = useSearchParams();

  return useMemo(() => {
    const params: Record<string, string | undefined> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    const filters = parseProjectFilters(params);
    return buildFilterSummary(filters, params);
  }, [searchParams]);
}
