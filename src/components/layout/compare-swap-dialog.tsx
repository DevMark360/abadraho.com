"use client";

import { useEffect, useState } from "react";
import { GitCompare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  confirmCompareSwap,
  registerCompareSwapHandler,
  type CompareSwapRequest,
} from "@/lib/client/compare-actions";
import { MAX_COMPARE } from "@/lib/client/compare-store";

export function CompareSwapDialog() {
  const [request, setRequest] = useState<CompareSwapRequest | null>(null);

  useEffect(() => {
    registerCompareSwapHandler(setRequest);
    return () => registerCompareSwapHandler(null);
  }, []);

  if (!request) return null;

  const { pending, current } = request;

  function close() {
    setRequest(null);
  }

  function swap(replaceProjectId: number) {
    confirmCompareSwap(replaceProjectId, pending);
    close();
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-swap-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={close}
          className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100">
            <GitCompare className="h-5 w-5 text-zinc-700" />
          </div>
          <div>
            <h2 id="compare-swap-title" className="text-lg font-semibold text-zinc-900">
              Compare is full ({MAX_COMPARE}/{MAX_COMPARE})
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              You can only compare {MAX_COMPARE} projects at a time. Replace one to add{" "}
              <span className="font-medium text-zinc-900">{pending.slug}</span>.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {current.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => swap(entry.id)}
              className="flex w-full items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 text-left text-sm transition-colors hover:border-zinc-400 hover:bg-zinc-50"
            >
              <span className="font-medium text-zinc-900">{entry.slug}</span>
              <span className="text-xs font-medium text-zinc-500">Replace</span>
            </button>
          ))}
        </div>

        <Button type="button" variant="outline" className="mt-4 w-full" onClick={close}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
