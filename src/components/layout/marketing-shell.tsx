"use client";

import { AuthProvider } from "@/components/auth/auth-provider";
import { MarketingTopNav } from "@/components/layout/marketing-top-nav";
import { ShellOverlays } from "@/components/layout/shell-overlays";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

/**
 * Home page layout: floating clay top bar, no sidebar, whole page scrolls. Every other page
 * (listings, projects, content pages, account, admin) uses AppShell with the sidebar.
 */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className={cn("flex h-screen flex-col overflow-hidden", designTw.pageCanvas)}>
        <MarketingTopNav />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        <ShellOverlays showSupport />
      </div>
    </AuthProvider>
  );
}
