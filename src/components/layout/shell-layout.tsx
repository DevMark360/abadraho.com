"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ShellOverlays } from "@/components/layout/shell-overlays";
import { useSidebar } from "@/components/layout/sidebar-context";
import type { AppShellSidebar } from "@/components/layout/app-shell";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

export function ShellLayout({
  children,
  sidebar = "public",
}: {
  children: ReactNode;
  sidebar?: AppShellSidebar;
}) {
  const { open } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const Side = sidebar === "staff" ? AdminSidebar : AppSidebar;
  const sideProps = { collapsible: true as const };

  useEffect(() => {
    setMounted(true);
  }, []);

  const sidebarExpanded = !mounted || open;

  return (
    <div className={designTw.shell}>
      <div
        className={cn(
          // pr/pb leave room for the panel's soft shadow; z-10 keeps the content column from
          // painting over it (both previously clipped the shadow into hard corners).
          "relative z-10 hidden shrink-0 pb-4 pl-3 pr-3 pt-3 transition-[width] duration-300 ease-in-out lg:block",
          sidebarExpanded ? "w-[244px] xl:w-[264px]" : "w-[5rem]"
        )}
        suppressHydrationWarning
      >
        <Side {...sideProps} />
      </div>

      <div className={designTw.shellColumn}>
        <MobileNav sidebar={sidebar} />
        {sidebar === "staff" ? (
          <div className={designTw.shellMain}>{children}</div>
        ) : (
          children
        )}
      </div>

      {sidebar === "public" ? <ShellOverlays showSupport /> : null}
    </div>
  );
}
