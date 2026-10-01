"use client";

import { GitCompare } from "lucide-react";
import { useSyncExternalStore } from "react";
import { requestToggleCompare } from "@/lib/client/compare-actions";
import { isInCompareSynced } from "@/lib/client/compare-sync";
import { cn } from "@/lib/utils";

function subscribeCompare(cb: () => void) {
  window.addEventListener("abadraho-compare", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("abadraho-compare", cb);
    window.removeEventListener("storage", cb);
  };
}

export function ProjectCardCompareToggle({
  projectId,
  slug,
  className,
}: {
  projectId: number;
  slug: string;
  className?: string;
}) {
  const compared = useSyncExternalStore(
    subscribeCompare,
    () => isInCompareSynced(projectId),
    () => false
  );

  return (
    <label
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-lg px-1 py-0.5 text-sm font-medium transition-colors",
        compared ? "text-zinc-900" : "text-zinc-700 hover:text-zinc-900",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={compared}
        onChange={() => requestToggleCompare(projectId, slug)}
        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
        aria-label={`Compare ${slug}`}
      />
      <GitCompare className="h-4 w-4 shrink-0" aria-hidden />
      <span>{compared ? "In compare" : "Compare"}</span>
    </label>
  );
}
