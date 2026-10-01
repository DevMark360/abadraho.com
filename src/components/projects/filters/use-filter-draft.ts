"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFilterParams } from "@/components/projects/filters/use-filter-params";
import { HOUSING_BUDGET_PARAM_KEYS } from "@/lib/housing-budget";

export const FILTER_PARAM_KEYS = [
  "q",
  "city",
  "area",
  "developer",
  "minPrice",
  "maxPrice",
  "minDownPayment",
  "maxDownPayment",
  "minMonthlyInstallment",
  "maxMonthlyInstallment",
  "unitType",
  "bedrooms",
  "status",
  "plan",
  "hc",
  ...HOUSING_BUDGET_PARAM_KEYS,
] as const;

const PRESERVED_KEYS = ["view", "currency"] as const;

function recordFromParams(params: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  params.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export function useFilterDraft() {
  const { searchParams, setMany, resetAll, pending, setOne } = useFilterParams();
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    recordFromParams(searchParams)
  );

  useEffect(() => {
    setDraft(recordFromParams(searchParams));
  }, [searchParams]);

  const draftGet = useCallback((key: string) => draft[key] ?? null, [draft]);

  const parseDraftList = useCallback(
    (key: string) => draftGet(key)?.split(",").filter(Boolean) ?? [],
    [draftGet]
  );

  const draftSetOne = useCallback((key: string, value: string | null) => {
    setDraft((prev) => {
      const next = { ...prev };
      if (!value) delete next[key];
      else next[key] = value;
      return next;
    });
  }, []);

  const draftSetMany = useCallback((updates: Record<string, string | null>) => {
    setDraft((prev) => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(updates)) {
        if (!value) delete next[key];
        else next[key] = value;
      }
      return next;
    });
  }, []);

  const hasDraftChanges = useMemo(() => {
    const applied = recordFromParams(searchParams);
    const keys = new Set([
      ...FILTER_PARAM_KEYS,
      ...PRESERVED_KEYS,
    ]);
    for (const key of keys) {
      if (PRESERVED_KEYS.includes(key as (typeof PRESERVED_KEYS)[number])) continue;
      if ((draft[key] ?? "") !== (applied[key] ?? "")) return true;
    }
    return false;
  }, [draft, searchParams]);

  const hasAppliedFilters = useMemo(
    () => FILTER_PARAM_KEYS.some((key) => searchParams.has(key)),
    [searchParams]
  );

  const hasDraftFilters = useMemo(
    () => FILTER_PARAM_KEYS.some((key) => key in draft),
    [draft]
  );

  const buildApplyUpdates = useCallback(
    (source: Record<string, string>) => {
      const updates: Record<string, string | null> = {};
      for (const key of FILTER_PARAM_KEYS) {
        updates[key] = source[key] ?? null;
      }
      for (const key of PRESERVED_KEYS) {
        const value = source[key] ?? searchParams.get(key);
        if (value) updates[key] = value;
      }
      return updates;
    },
    [searchParams]
  );

  const applyDraft = useCallback(() => {
    setMany(buildApplyUpdates(draft));
  }, [draft, buildApplyUpdates, setMany]);

  /** Merge URL param updates then apply immediately (avoids stale draft after setState). */
  const applyDraftUpdates = useCallback(
    (updates: Record<string, string | null>) => {
      const merged = { ...draft };
      for (const [key, value] of Object.entries(updates)) {
        if (!value) delete merged[key];
        else merged[key] = value;
      }
      setDraft(merged);
      setMany(buildApplyUpdates(merged));
    },
    [draft, buildApplyUpdates, setMany]
  );

  const clearDraft = useCallback(() => {
    const preserved: Record<string, string> = {};
    for (const key of PRESERVED_KEYS) {
      const value = searchParams.get(key);
      if (value) preserved[key] = value;
    }
    setDraft(preserved);
    resetAll();
  }, [resetAll, searchParams]);

  return {
    draft,
    draftGet,
    parseDraftList,
    draftSetOne,
    draftSetMany,
    applyDraft,
    applyDraftUpdates,
    clearDraft,
    hasDraftChanges,
    hasAppliedFilters,
    hasDraftFilters,
    pending,
    searchParams,
    setOne,
  };
}
