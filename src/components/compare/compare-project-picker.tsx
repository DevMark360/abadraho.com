"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Building2, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { requestToggleCompare } from "@/lib/client/compare-actions";
import { getCompareIds } from "@/lib/client/compare-store";
import { cn, formatPrice } from "@/lib/utils";
import type { ProjectListItem } from "@/types/project";

export function CompareProjectPicker({
  slotLabel,
  className,
}: {
  slotLabel: string;
  className?: string;
}) {
  const inputId = useId();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (term: string) => {
    const q = term.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q, perPage: "8" });
      const res = await fetch(`/api/v1/projects?${params}`, { credentials: "same-origin" });
      const json = (await res.json()) as {
        success?: boolean;
        data?: ProjectListItem[];
      };
      const inCompare = new Set(getCompareIds());
      setResults((json.data ?? []).filter((p) => !inCompare.has(p.id)));
    } catch {
      setError("Search failed. Try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void search(query);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query, open, search]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(project: ProjectListItem) {
    requestToggleCompare(project.id, project.slug);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "flex min-h-[280px] flex-col rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50/80 p-5",
        className
      )}
    >
      <p className="text-center text-sm font-semibold text-zinc-700">{slotLabel}</p>
      <p className="mt-1 text-center text-xs text-zinc-500">
        Search by project or developer name
      </p>

      <div className="relative mt-5">
        <label htmlFor={inputId} className="sr-only">
          {slotLabel}
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
          aria-hidden
        />
        <Input
          id={inputId}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder="e.g. Metropolis Signature"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="pl-9"
          autoComplete="off"
        />

        {open && (query.trim().length >= 2 || loading) ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 max-h-64 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
          >
            {loading ? (
              <li className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Searching…
              </li>
            ) : error ? (
              <li className="px-4 py-3 text-sm text-red-600">{error}</li>
            ) : results.length === 0 ? (
              <li className="px-4 py-3 text-sm text-zinc-500">No projects found.</li>
            ) : (
              results.map((project) => (
                <li key={project.id} role="option">
                  <button
                    type="button"
                    onClick={() => pick(project)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-50"
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                      {project.imageUrl ? (
                        <Image
                          src={project.imageUrl}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-zinc-300">
                          <Building2 className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {project.name}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {project.area ?? project.builderName ?? "Off-plan project"}
                        {project.minPrice
                          ? ` · ${formatPrice(project.minPrice)}`
                          : ""}
                      </p>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      <p className="mt-auto pt-6 text-center text-xs text-zinc-400">
        Or browse{" "}
        <Link href="/projects" className="font-medium text-brand-accent hover:underline">
          all listings
        </Link>{" "}
        and tick Compare on any card.
      </p>
    </div>
  );
}
