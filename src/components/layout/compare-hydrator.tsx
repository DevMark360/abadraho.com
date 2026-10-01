"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { loadServerCompareEntries, syncLocalCompareToServer } from "@/lib/client/compare-sync";

/** Loads DB compare list when user is logged in; merges local items once per session. */
export function CompareHydrator() {
  const { user, loading } = useAuth();
  const didHydrate = useRef(false);

  useEffect(() => {
    if (loading || !user || didHydrate.current) return;
    didHydrate.current = true;

    void (async () => {
      await syncLocalCompareToServer();
      await loadServerCompareEntries();
    })();
  }, [user, loading]);

  return null;
}
