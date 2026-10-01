"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { loadServerWishlistIds, syncLocalWishlistToServer } from "@/lib/client/wishlist-sync";
import { syncGuestHistoryToServer } from "@/lib/client/search-history-track";
import { syncActivityLogToServer } from "@/lib/client/activity-log";

/** Loads DB wishlist ids when user is logged in; merges local items exactly once per session */
export function WishlistHydrator() {
  const { user, loading } = useAuth();
  const didHydrate = useRef(false);

  useEffect(() => {
    if (loading || !user || didHydrate.current) return;
    didHydrate.current = true;

    void (async () => {
      await syncLocalWishlistToServer();
      await syncGuestHistoryToServer();
      await syncActivityLogToServer();
      await loadServerWishlistIds();
    })();
  }, [user, loading]);

  return null;
}
