"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  getAdminNavGroups,
  type AdminNavGroup,
  type AdminNavItem,
} from "@/config/admin-nav";
import { ADMIN_NAV_HREF_PERMISSION } from "@/config/admin-permissions";
import { userTypeIds } from "@/config/site";
import { AbadrahoLogo } from "@/components/brand/abadraho-logo";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";
import {
  Activity,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  HardHat,
  Inbox,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  Star,
  Tags,
  Ticket,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useSidebarOptional } from "@/components/layout/sidebar-context";
import { SidebarRailToggle } from "@/components/layout/sidebar-rail-toggle";
import { adminPortalLabel, resolvePortalRole } from "@/config/portal-nav";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

function itemHref(item: AdminNavItem): string {
  return item.href;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin/dashboard") return pathname === href;
  if (href === "/admin/projects") return pathname === "/admin/projects";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupActive(pathname: string, group: AdminNavGroup): boolean {
  return group.items.some((item) => !item.download && isActive(pathname, item.href));
}

const navItemClass = (active: boolean) =>
  cn(
    "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
    active ? designTw.navActive : designTw.navInactive
  );

const subItemClass = (active: boolean) =>
  cn(
    "block rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
    active ? designTw.navActive : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
  );

const groupButtonClass = (active: boolean) =>
  cn(
    "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
    active ? "bg-zinc-100 text-zinc-900" : "text-zinc-700 hover:bg-zinc-100"
  );

const GROUP_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  projects: Building2,
  users: Users,
  builders: HardHat,
  inquiries: Inbox,
  blogs: BookOpen,
  tags: Tags,
  activity: Activity,
  vouchers: Ticket,
  teams: UsersRound,
  more: Star,
  access_control: Shield,
  account: Settings,
};

function filterNavByPermissions(
  groups: AdminNavGroup[],
  permissions: string[] | null
): AdminNavGroup[] {
  if (permissions === null) return groups;
  const set = new Set(permissions);
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const perm = ADMIN_NAV_HREF_PERMISSION[item.href];
        if (!perm) return true;
        return set.has(perm);
      }),
    }))
    .filter((group) => group.items.length > 0);
}

export function AdminSidebar({ collapsible = false }: { collapsible?: boolean }) {
  const pathname = usePathname();
  const [userTypeId, setUserTypeId] = useState<number | null>(null);
  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/auth/me").then((r) => r.json()),
      fetch("/api/v1/auth/me", { credentials: "same-origin" }).then((r) => r.json()),
    ])
      .then(([adminJson, userJson]) => {
        const admin = adminJson.admin as { userTypeId?: number; source?: string } | undefined;
        let typeId: number | null = null;
        if (admin?.userTypeId != null) {
          typeId = admin.userTypeId;
        } else if (admin?.source === "admin") {
          typeId = userTypeIds.admin;
        } else if (userJson.user?.userTypeId != null) {
          typeId = userJson.user.userTypeId;
        }
        if (typeId != null) setUserTypeId(typeId);
        if (adminJson.enforcePermissions === true && Array.isArray(adminJson.permissions)) {
          setPermissions(adminJson.permissions as string[]);
        } else {
          setPermissions(null);
        }
      })
      .catch(() => {});
  }, []);

  const groups = useMemo(() => {
    if (userTypeId == null) return [];
    const base = getAdminNavGroups(userTypeId);
    return filterNavByPermissions(base, permissions);
  }, [userTypeId, permissions]);

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const g of groups) {
      if (g.items.length > 1 && groupActive(pathname, g)) {
        next[g.id] = true;
      }
    }
    setOpenGroups((prev) => ({ ...prev, ...next }));
  }, [pathname, groups]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const sidebar = useSidebarOptional();

  const collapsed = collapsible && sidebar != null && !sidebar.open;
  const portalRole = resolvePortalRole(userTypeId);
  const isBuilder = portalRole === "builder";

  return (
    <aside
      className={cn(
        designTw.sidebarPanel,
        collapsed ? "items-center" : ""
      )}
    >
      <div
        className={cn(
          "flex w-full shrink-0 items-center border-b border-clay-line",
          collapsed ? "justify-center px-2 py-3" : "gap-2 px-3 py-3"
        )}
      >
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <AbadrahoLogo href="/" height={40} className="!w-auto max-w-full" />
          </div>
        ) : null}
        {collapsible && sidebar ? (
          <SidebarRailToggle collapsed={collapsed} onClick={sidebar.toggle} />
        ) : null}
      </div>

      {!collapsed ? (
        <div className="border-b border-clay-line px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
            {adminPortalLabel(portalRole)}
          </p>
          {isBuilder ? (
            <p className="mt-1 text-xs text-zinc-500">Projects, units & inquiries</p>
          ) : portalRole === "staff" ? (
            <p className="mt-1 text-xs text-zinc-500">Full staff dashboard</p>
          ) : null}
        </div>
      ) : null}

      <nav
        className={cn(
          "min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden overscroll-contain",
          collapsed ? "w-full px-2 py-2" : "px-3 py-3"
        )}
      >
        {userTypeId == null && !collapsed && (
          <p className="px-3 py-2 text-xs text-zinc-400">Loading menu…</p>
        )}
        {collapsed
          ? groups.map((group) => {
              const item = group.items.find((entry) => !entry.download) ?? group.items[0];
              if (!item) return null;
              const Icon = GROUP_ICONS[group.id] ?? ClipboardList;
              const active = groupActive(pathname, group);
              return (
                <Link
                  key={group.id}
                  href={itemHref(item) as "/admin/dashboard"}
                  prefetch={false}
                  title={group.label}
                  className={cn(
                    "flex items-center justify-center rounded-lg p-2.5 transition-colors",
                    active ? designTw.navActive : designTw.navInactive
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                </Link>
              );
            })
          : null}
        {!collapsed &&
          groups.map((group) => {
          const single = group.items.length === 1 && group.id === "dashboard";
          if (single) {
            const item = group.items[0]!;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={group.id}
                href={itemHref(item) as "/admin/dashboard"}
                className={navItemClass(active)}
              >
                {group.label}
              </Link>
            );
          }

          const expanded = openGroups[group.id] ?? groupActive(pathname, group);
          const groupIsActive = groupActive(pathname, group);

          return (
            <div key={group.id} className="pt-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={groupButtonClass(groupIsActive)}
              >
                <span>{group.label}</span>
                {expanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                )}
              </button>
              {expanded && (
                <ul className="mb-1 ml-2 space-y-0.5 border-l border-zinc-200 pl-2">
                  {group.items.map((item) => {
                    const active = !item.download && isActive(pathname, item.href);
                    const linkClass = subItemClass(active);
                    return (
                      <li key={item.href + item.label}>
                        {item.download ? (
                          <a href={item.href} download className={linkClass}>
                            {item.label}
                          </a>
                        ) : (
                          <Link
                            href={itemHref(item) as "/admin/dashboard"}
                            prefetch={false}
                            className={linkClass}
                          >
                            {item.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
          })}
      </nav>

      <div
        className={cn(
          "w-full shrink-0 border-t border-clay-line",
          collapsed ? "space-y-2 px-2 py-3" : "space-y-3 p-3"
        )}
      >
        <Link
          href="/"
          title={collapsed ? "View public listings" : undefined}
          className={cn(
            "rounded-lg text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
            collapsed
              ? "flex items-center justify-center p-2.5"
              : "block px-3 py-2 text-sm"
          )}
        >
          {collapsed ? <ExternalLink className="h-4 w-4" /> : "View public listings"}
        </Link>
        {collapsed ? (
          <button
            type="button"
            title="Log out"
            aria-label="Log out"
            onClick={async () => {
              await Promise.all([
                fetch("/api/admin/auth/logout", { method: "POST" }),
                fetch("/api/v1/auth/logout", {
                  method: "POST",
                  credentials: "same-origin",
                }),
              ]);
              window.location.href = "/login";
            }}
            className="flex w-full items-center justify-center rounded-lg p-2.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <LogOut className="h-4 w-4" />
          </button>
        ) : (
          <AdminLogoutButton />
        )}
      </div>
    </aside>
  );
}
