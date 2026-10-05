"use client";

import { AuthProvider } from "@/components/auth/auth-provider";
import { MarketingTopNav } from "@/components/layout/marketing-top-nav";
import { ShellOverlays } from "@/components/layout/shell-overlays";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

/**
 * Site layout for every public page (home, listings, projects, content pages): floating clay
 * top bar, no sidebar. Logged-in areas (account, broker, advertising, admin) use AppShell.
 * Modes:
 * - `app` (default): pages manage their own scroll area with `flex-1 overflow-y-auto`
 *   (listings + map, project detail, PublicPage) — same contract as the old sidebar shell.
 * - `page`: the whole page scrolls (home). Needed because flex children with
 *   `overflow-hidden` would otherwise shrink to zero height.
 */
export function MarketingShell({
  children,
  mode = "app",
}: {
  children: React.ReactNode;
  mode?: "app" | "page";
}) {
  return (
    <AuthProvider>
      <div className={cn("flex h-screen flex-col overflow-hidden", designTw.pageCanvas)}>
        <MarketingTopNav />
        <main
          className={cn(
            "min-h-0 flex-1",
            mode === "app" ? "flex flex-col overflow-hidden" : "overflow-y-auto"
          )}
        >
          {children}
        </main>
        <ShellOverlays showSupport />
      </div>
    </AuthProvider>
  );
}
