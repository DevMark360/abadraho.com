import { AdminUserMenu } from "@/components/admin/admin-user-menu";
import { AdminPermissionsProvider } from "@/components/admin/admin-permissions-provider";
import { AppShell } from "@/components/layout/app-shell";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

/**
 * Builder + staff routes use the same AppShell as /broker (not a separate dark admin chrome).
 */
export function AdminShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <AppShell sidebar="staff">
      <div className={cn("min-w-0", designTw.shellContent)}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <AdminUserMenu />
          </div>
        </div>
        <AdminPermissionsProvider>{children}</AdminPermissionsProvider>
      </div>
    </AppShell>
  );
}
