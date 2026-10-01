"use client";
import { LoadingState } from "@/components/ui/loading-state";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { AdvertisingPortalProvider } from "@/components/advertising/advertising-portal-context";
import { canAccessBuilderPortal } from "@/lib/roles";
import { userTypeIds } from "@/config/site";
import type { AdvertisingDashboardData } from "@/server/services/advertising-portal.service";

type GateState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "not_builder" }
  | { status: "no_builder"; detail?: string }
  | { status: "portal_error"; detail?: string }
  | { status: "ready"; dashboard: AdvertisingDashboardData };

export function AdvertisingGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [gate, setGate] = useState<GateState>({ status: "loading" });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setGate({ status: "guest" });
      return;
    }
    const isBuilder =
      canAccessBuilderPortal(user.userTypeId) || user.role === "builder";
    if (!isBuilder) {
      setGate({ status: "not_builder" });
      return;
    }

    let cancelled = false;

    (async () => {
      await fetch("/api/v1/auth/me", { credentials: "same-origin" }).catch(() => undefined);

      const res = await fetch("/api/v1/advertising/dashboard", { credentials: "same-origin" });
      const j = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        code?: string;
        message?: string;
        wallet?: AdvertisingDashboardData["wallet"];
      };
      if (cancelled) return;

      if (j.success === true && j.wallet) {
        setGate({ status: "ready", dashboard: j as AdvertisingDashboardData });
        return;
      }
      if (res.status === 401) {
        setGate({ status: "guest" });
        return;
      }
      if (j.code === "NOT_BUILDER") {
        setGate({ status: "not_builder" });
        return;
      }
      if (j.code === "NO_BUILDER_PROFILE") {
        setGate({ status: "no_builder", detail: j.message });
        return;
      }
      if (j.code === "DASHBOARD_ERROR" || res.status >= 500) {
        setGate({
          status: "portal_error",
          detail: j.message ?? "Server error loading dashboard.",
        });
        return;
      }
      setGate({ status: "no_builder", detail: j.message });
    })().catch(() => {
      if (!cancelled) setGate({ status: "portal_error" });
    });

    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  if (loading || gate.status === "loading") {
    return <LoadingState size="sm" label="Loading advertising portal…" />;
  }

  if (gate.status === "guest") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <p className="font-medium text-zinc-900">Sign in as a builder</p>
        <p className="mt-2 text-sm text-zinc-600">
          Use the email and password for your builder account (user type Builder in the database).
        </p>
        <Link
          href="/login?ref=/advertising"
          className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (gate.status === "not_builder") {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        <p className="font-medium text-zinc-900">Builder access only</p>
        <p className="mt-2 text-sm text-zinc-600">
          Your account is not a builder ({userTypeIds.builder} user type). Use My Account instead.
        </p>
        <Link href="/account" className="mt-4 inline-block text-sm underline">
          Go to my account
        </Link>
      </div>
    );
  }

  if (gate.status === "portal_error") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-zinc-900">Advertising portal temporarily unavailable</p>
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

  if (gate.status === "no_builder") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <p className="font-medium text-zinc-900">Could not open advertising portal</p>
        <p className="mt-2 text-sm text-zinc-600">
          Your account ({user?.email ?? "signed in"}) needs a linked builder profile. Sign out and
          sign in again with the same email as in <strong>Admin → Builders</strong>.
        </p>
        {gate.detail ? <p className="mt-2 text-xs text-zinc-500">{gate.detail}</p> : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/login?ref=/advertising"
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
    <AdvertisingPortalProvider initialDashboard={gate.dashboard}>
      {children}
    </AdvertisingPortalProvider>
  );
}
