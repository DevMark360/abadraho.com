"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { BrokerDashboardData } from "@/server/services/broker-portal.service";

type BrokerPortalContextValue = {
  dashboard: BrokerDashboardData | null;
  setDashboard: (data: BrokerDashboardData | null) => void;
  refreshDashboard: () => Promise<BrokerDashboardData | null>;
};

const BrokerPortalContext = createContext<BrokerPortalContextValue | null>(null);

export function BrokerPortalProvider({
  children,
  initialDashboard = null,
}: {
  children: ReactNode;
  initialDashboard?: BrokerDashboardData | null;
}) {
  const [dashboard, setDashboard] = useState<BrokerDashboardData | null>(initialDashboard);

  const refreshDashboard = useCallback(async () => {
    const res = await fetch("/api/v1/broker/dashboard", { credentials: "same-origin" });
    const j = await res.json().catch(() => ({}));
    if (j.success && j.broker) {
      const data = j as BrokerDashboardData;
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
    <BrokerPortalContext.Provider value={value}>{children}</BrokerPortalContext.Provider>
  );
}

export function useBrokerPortal() {
  const ctx = useContext(BrokerPortalContext);
  if (!ctx) {
    throw new Error("useBrokerPortal must be used within BrokerPortalProvider");
  }
  return ctx;
}

export function useOptionalBrokerPortal() {
  return useContext(BrokerPortalContext);
}