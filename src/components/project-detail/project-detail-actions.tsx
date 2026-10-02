"use client";

import Link from "next/link";
import { Heart, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleCompare, isInCompare } from "@/lib/client/compare-store";
import { toggleWishlist, isInWishlistSynced } from "@/lib/client/wishlist-sync";
import { useSyncExternalStore } from "react";
import { SocialShareButtons } from "@/components/project-detail/social-share-buttons";

export function ProjectDetailActions({
  projectId,
  slug,
  projectName,
}: {
  projectId: number;
  slug: string;
  projectName: string;
}) {
  const compared = useSyncExternalStore(
    subscribeCompare,
    () => isInCompare(projectId),
    () => false
  );
  const wished = useSyncExternalStore(
    subscribeWishlist,
    () => isInWishlistSynced(projectId),
    () => false
  );

  return (
    <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void toggleWishlist(projectId, slug)}
      >
        <Heart className={`h-4 w-4 ${wished ? "fill-rose-500 text-rose-500" : ""}`} />
        {wished ? "Saved" : "Wishlist"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          const result = toggleCompare(projectId, slug);
          if (result.rejected) {
            alert(
              "You can only compare 2 projects. Remove one from compare first, or open Compare."
            );
          }
        }}
      >
        <GitCompare className={`h-4 w-4 ${compared ? "text-brand-accent" : ""}`} />
        {compared ? "In compare" : "Compare"}
      </Button>
      <SocialShareButtons projectName={projectName} slug={slug} />
      {compared ? (
        <Link
          href="/compare"
          className="col-span-3 inline-flex min-h-[44px] items-center justify-center px-1 text-sm font-semibold text-brand-accent hover:underline sm:col-span-1"
        >
          Open compare →
        </Link>
      ) : null}
    </div>
  );
}

function subscribeCompare(cb: () => void) {
  window.addEventListener("abadraho-compare", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("abadraho-compare", cb);
    window.removeEventListener("storage", cb);
  };
}

function subscribeWishlist(cb: () => void) {
  window.addEventListener("abadraho-wishlist", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("abadraho-wishlist", cb);
    window.removeEventListener("storage", cb);
  };
}
