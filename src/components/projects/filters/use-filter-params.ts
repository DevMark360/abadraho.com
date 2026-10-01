"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

const PAGINATION_KEYS = new Set(["page", "perPage"]);

export function useFilterParams() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const get = useCallback(
    (key: string) => searchParams.get(key),
    [searchParams]
  );

  const push = useCallback(
    (next: URLSearchParams) => {
      const qs = next.toString();
      startTransition(() => {
        router.push(qs ? `/projects?${qs}` : "/projects", { scroll: false });
      });
    },
    [router, startTransition]
  );

  const setOne = useCallback(
    (key: string, value: string | null) => {
      const p = new URLSearchParams(searchParams.toString());
      if (!value) p.delete(key);
      else p.set(key, value);
      if (!PAGINATION_KEYS.has(key)) p.delete("page");
      push(p);
    },
    [searchParams, push]
  );

  const setMany = useCallback(
    (updates: Record<string, string | null>) => {
      const p = new URLSearchParams(searchParams.toString());
      let resetsPage = false;
      for (const [key, value] of Object.entries(updates)) {
        if (!PAGINATION_KEYS.has(key)) resetsPage = true;
        if (!value) p.delete(key);
        else p.set(key, value);
      }
      if (resetsPage) p.delete("page");
      push(p);
    },
    [searchParams, push]
  );

  const resetKeys = useCallback(
    (keys: string[]) => {
      const p = new URLSearchParams(searchParams.toString());
      keys.forEach((k) => p.delete(k));
      if (keys.some((k) => !PAGINATION_KEYS.has(k))) p.delete("page");
      push(p);
    },
    [searchParams, push]
  );

  const resetAll = useCallback(() => {
    const view = searchParams.get("view");
    const currency = searchParams.get("currency");
    const p = new URLSearchParams();
    if (view) p.set("view", view);
    if (currency) p.set("currency", currency);
    push(p);
  }, [searchParams, push]);

  return { get, setOne, setMany, resetKeys, resetAll, searchParams, pending };
}
