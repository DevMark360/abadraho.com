"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AdvertisingDashboardData } from "@/server/services/advertising-portal.service";

type AdvertisingPortalContextValue = {
  dashboard: AdvertisingDashboardData | null;
  setDashboard: (data: AdvertisingDashboardData | null) => void;
  refreshDashboard: () => Promise<AdvertisingDashboardData | null>;
};

const AdvertisingPortalContext = createContext<AdvertisingPortalContextValue | null>(null);

export function AdvertisingPortalProvider({
  children,
  initialDashboard = null,
}: {
  children: ReactNode;
  initialDashboard?: AdvertisingDashboardData | null;
}) {
  const [dashboard, setDashboard] = useState<AdvertisingDashboardData | null>(initialDashboard);

  const refreshDashboard = useCallback(async () => {
    const res = await fetch("/api/v1/advertising/dashboard", { credentials: "same-origin" });
    const j = await res.json().catch(() => ({}));
    if (j.success && j.wallet) {
      const data = j as AdvertisingDashboardData;
      setDashboard(data);
      return data;
    }
    setDashboard(null);
    return null;
  }, []);

  const value = useMemo(
    () => ({ dashboard, setDashboard, refreshDashboard }),
    [dashboard, refreshDashboard]
  );

  return (
    <AdvertisingPortalContext.Provider value={value}>
      {children}
    </AdvertisingPortalContext.Provider>
  );
}

export function useAdvertisingPortal() {
  const ctx = useContext(AdvertisingPortalContext);
  if (!ctx) {
    throw new Error("useAdvertisingPortal must be used within AdvertisingPortalProvider");
  }
  return ctx;
}
