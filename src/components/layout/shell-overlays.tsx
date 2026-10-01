"use client";

import { CompareBar } from "@/components/layout/compare-bar";
import { CompareHydrator } from "@/components/layout/compare-hydrator";
import { CompareSwapDialog } from "@/components/layout/compare-swap-dialog";
import { FloatingSupport } from "@/components/layout/floating-support";
import { WishlistHydrator } from "@/components/layout/wishlist-hydrator";

export function ShellOverlays({ showSupport }: { showSupport: boolean }) {
  return (
    <>
      {showSupport ? <FloatingSupport /> : null}
      <CompareBar />
      <CompareSwapDialog />
      <CompareHydrator />
      <WishlistHydrator />
    </>
  );
}
