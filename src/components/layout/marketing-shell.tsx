"use client";

import { AuthProvider } from "@/components/auth/auth-provider";
import { MarketingTopNav } from "@/components/layout/marketing-top-nav";
import { ShellOverlays } from "@/components/layout/shell-overlays";

/** Full-width marketing layout — no app sidebar (home, landing pages). */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-white">
        <MarketingTopNav />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        <ShellOverlays showSupport />
      </div>
    </AuthProvider>
  );
}
