"use client";

import { Heart, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  requestToggleCompare,
} from "@/lib/client/compare-actions";
import { isInCompareSynced } from "@/lib/client/compare-sync";
import { toggleWishlist, isInWishlistSynced } from "@/lib/client/wishlist-sync";
import { useSyncExternalStore } from "react";

interface ProjectCardActionsProps {
  projectId: number;
  slug: string;
}

export function ProjectCardActions({ projectId, slug }: ProjectCardActionsProps) {
  const compared = useSyncExternalStore(
    (cb) => {
      if (typeof window === "undefined") return () => {};
      window.addEventListener("abadraho-compare", cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener("abadraho-compare", cb);
        window.removeEventListener("storage", cb);
      };
    },
    () => isInCompareSynced(projectId),
    () => false
  );
  const wished = useSyncExternalStore(
    (cb) => {
      if (typeof window === "undefined") return () => {};
      window.addEventListener("abadraho-wishlist", cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener("abadraho-wishlist", cb);
        window.removeEventListener("storage", cb);
      };
    },
    () => isInWishlistSynced(projectId),
    () => false
  );

  return (
    <div className="flex gap-1">
      <button
        type="button"
        title="Wishlist"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void toggleWishlist(projectId, slug);
        }}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm backdrop-blur transition-colors hover:bg-white",
          wished && "text-rose-500"
        )}
      >
        <Heart className={cn("h-4 w-4", wished && "fill-current")} />
      </button>
      <button
        type="button"
        title="Compare"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          requestToggleCompare(projectId, slug);
        }}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm backdrop-blur transition-colors hover:bg-white",
          compared && "text-zinc-900 ring-2 ring-zinc-900"
        )}
      >
        <GitCompare className="h-4 w-4" />
      </button>
    </div>
  );
}
