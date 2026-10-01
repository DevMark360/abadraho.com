"use client";

import { AuthProvider } from "@/components/auth/auth-provider";
import { ShellLayout } from "@/components/layout/shell-layout";
import { SidebarProvider } from "@/components/layout/sidebar-context";

export type AppShellSidebar = "public" | "staff";

export function AppShell({
  children,
  sidebar = "public",
}: {
  children: React.ReactNode;
  /** `staff` — builder / admin panel nav (same chrome as public + broker) */
  sidebar?: AppShellSidebar;
}) {
  return (
    <AuthProvider>
      <SidebarProvider>
        <ShellLayout sidebar={sidebar}>{children}</ShellLayout>
      </SidebarProvider>
    </AuthProvider>
  );
}
