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
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void toggleWishlist(projectId, slug)}
      >
        <Heart className={`h-4 w-4 ${wished ? "fill-rose-500 text-rose-500" : ""}`} />
        Wishlist
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
        <GitCompare className="h-4 w-4" />
        {compared ? "In compare" : "Compare"}
      </Button>
      <Link href="/compare">
        <Button variant="secondary" size="sm">
          View compare
        </Button>
      </Link>
      <SocialShareButtons projectName={projectName} slug={slug} />
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
