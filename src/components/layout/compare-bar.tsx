"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitCompare, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import {
  clearCompare,
  EMPTY_COMPARE_LIST,
  getCompareList,
  getCompareSnapshotKey,
  MAX_COMPARE,
} from "@/lib/client/compare-store";

function subscribe(cb: () => void) {
  window.addEventListener("abadraho-compare", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("abadraho-compare", cb);
    window.removeEventListener("storage", cb);
  };
}

export function CompareBar() {
  const pathname = usePathname();
  const snapshotKey = useSyncExternalStore(
    subscribe,
    getCompareSnapshotKey,
    () => ""
  );
  const list = snapshotKey ? getCompareList() : EMPTY_COMPARE_LIST;

  if (!list.length || pathname.startsWith("/compare")) return null;

  return (
    <div className="compare-bar-root">
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-lg">
        <GitCompare className="h-5 w-5 shrink-0 text-zinc-700" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900">
            Compare ({list.length}/{MAX_COMPARE})
          </p>
          <p className="truncate text-sm text-zinc-500">
            {list
              .map((e) =>
                e.unitId ? `${e.slug} (unit #${e.unitId})` : e.slug
              )
              .join(" · ")}
          </p>
        </div>
        <Link
          href="/compare"
          className="compare-bar-open shrink-0 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800"
        >
          {list.length === MAX_COMPARE ? "Compare now" : "Open"}
        </Link>
        <button
          type="button"
          onClick={() => clearCompare()}
          className="compare-bar-clear text-zinc-500 hover:bg-zinc-100"
          aria-label="Clear compare"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
