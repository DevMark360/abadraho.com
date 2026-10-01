"use client";
import { LoadingState } from "@/components/ui/loading-state";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { BrokerPortalProvider } from "@/components/broker/broker-portal-context";
import { canAccessBrokerPortal } from "@/lib/roles";
import { userTypeIds } from "@/config/site";
import type { BrokerDashboardData } from "@/server/services/broker-portal.service";

type GateState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "not_agent" }
  | { status: "no_broker"; detail?: string }
  | { status: "portal_error"; detail?: string }
  | { status: "ready"; dashboard: BrokerDashboardData };

export function BrokerGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [gate, setGate] = useState<GateState>({ status: "loading" });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setGate({ status: "guest" });
      return;
    }
    const isAgent =
      canAccessBrokerPortal(user.userTypeId) || user.role === "broker";
    if (!isAgent) {
      setGate({ status: "not_agent" });
      return;
    }

    let cancelled = false;

    (async () => {
      await fetch("/api/v1/auth/me", { credentials: "same-origin" }).catch(() => undefined);

      const res = await fetch("/api/v1/broker/dashboard", { credentials: "same-origin" });
      const j = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        code?: string;
        message?: string;
        broker?: BrokerDashboardData["broker"];
      };
      if (cancelled) return;

      if (j.success === true && j.broker) {
        setGate({ status: "ready", dashboard: j as BrokerDashboardData });
        return;
      }
      if (res.status === 401) {
        setGate({ status: "guest" });
        return;
      }
      if (j.code === "NOT_AGENT") {
        setGate({ status: "not_agent" });
        return;
      }
      if (j.code === "NO_BROKER_PROFILE") {
        setGate({ status: "no_broker", detail: j.message });
        return;
      }
      if (j.code === "DASHBOARD_ERROR" || res.status >= 500) {
        setGate({
          status: "portal_error",
          detail: j.message ?? "Server error loading dashboard.",
        });
        return;
      }
      setGate({ status: "no_broker", detail: j.message });
    })().catch(() => {
      if (!cancelled) setGate({ status: "portal_error" });
    });

    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  if (loading || gate.status === "loading") {
    return <LoadingState size="sm" label="Loading agent portal…" />;
  }

  if (gate.status === "guest") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <p className="font-medium text-zinc-900">Sign in as an agent</p>
        <p className="mt-2 text-sm text-zinc-600">
          Use the email and password for your agent account (user type Agent in the database).
        </p>
        <Link
          href="/login?ref=/broker"
          className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (gate.status === "not_agent") {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <p className="font-medium text-zinc-900">Agent access only</p>
        <p className="mt-2 text-sm text-zinc-600">
          Your account is not an agent ({userTypeIds.agent} user type). Browse projects or use My
          Profile instead.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm underline">
          Browse off-plan projects
        </Link>
      </div>
    );
  }

  if (gate.status === "portal_error") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-zinc-900">Agent portal temporarily unavailable</p>
        <p className="mt-2 text-sm text-zinc-600">
          {gate.detail ??
            "The server could not load your dashboard. Restart the app, then reload this page."}
        </p>
        <button
          type="button"
          className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    );
  }

  if (gate.status === "no_broker") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <p className="font-medium text-zinc-900">Could not open agent portal</p>
        <p className="mt-2 text-sm text-zinc-600">
          Your account ({user?.email ?? "signed in"}) needs a linked broker profile. Sign out and
          sign in again with the same email as in <strong>Admin → Agents</strong>.
        </p>
        {gate.detail ? <p className="mt-2 text-xs text-zinc-500">{gate.detail}</p> : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/login?ref=/broker"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Sign in again
          </Link>
          <Link href="/account" className="text-sm underline">
            My account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <BrokerPortalProvider initialDashboard={gate.dashboard}>
      {children}
    </BrokerPortalProvider>
  );
}
