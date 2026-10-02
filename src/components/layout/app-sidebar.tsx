"use client";
import { LoadingState } from "@/components/ui/loading-state";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  LayoutGrid,
  User,
  Info,
  BookOpen,
  CalendarDays,
  Headphones,
  LogOut,
} from "lucide-react";
import { useSidebarOptional } from "@/components/layout/sidebar-context";
import { SidebarRailToggle } from "@/components/layout/sidebar-rail-toggle";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";
import { AbadrahoLogo } from "@/components/brand/abadraho-logo";
import { getAccountHomePath, isAccountAreaActive } from "@/config/account-nav";
import {
  useAuth,
  userDisplayName,
  userInitials,
} from "@/components/auth/auth-provider";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/projects", label: "Off-plan", icon: LayoutGrid },
  { href: "/about-us", label: "About us", icon: Info },
  { href: "/blog", label: "Blog", icon: BookOpen },
  { href: "/events", label: "Events", icon: CalendarDays },
] as const;

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/" || pathname === "/home";
  }
  if (href === "/projects") {
    return pathname === "/projects" || pathname.startsWith("/project/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ collapsible = false }: { collapsible?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const sidebar = useSidebarOptional();

  const collapsed = collapsible && sidebar != null && !sidebar.open;

  const accountHref = user
    ? getAccountHomePath(user.userTypeId, user.role)
    : "/account";
  const accountActive = isAccountAreaActive(pathname, accountHref, user?.userTypeId);

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST", credentials: "same-origin" });
    await refresh();
    router.push("/login");
    router.refresh();
  }

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
        <p className="w-full px-5 pb-2 pt-3 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          Main menu
        </p>
      ) : null}

      <nav
        className={cn(
          "flex-1 space-y-1 overflow-y-auto",
          collapsed ? "w-full px-2 py-2" : "w-full px-3"
        )}
      >
        {nav.map((item) => {
          const isActive = isNavActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-lg font-medium transition-colors",
                collapsed
                  ? cn(
                      "justify-center p-2.5",
                      isActive ? designTw.navActive : designTw.navInactive
                    )
                  : cn(
                      "gap-2.5 px-3 py-2.5 text-sm",
                      isActive ? designTw.navActive : designTw.navInactive
                    )
              )}
            >
              <Icon className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
              {!collapsed ? <span className="flex-1">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "w-full shrink-0 space-y-2 border-t border-clay-line",
          collapsed ? "px-2 py-3" : "space-y-3 p-3"
        )}
      >
        <Link
          href="/contact"
          title={collapsed ? "Contact Support" : undefined}
          className={cn(
            "flex items-center rounded-lg border border-zinc-200 font-medium text-zinc-800 hover:bg-zinc-50",
            collapsed
              ? "justify-center p-2.5"
              : "w-full justify-center gap-2 py-2.5 text-sm"
          )}
        >
          <Headphones className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
          {!collapsed ? "Contact Support" : null}
        </Link>

        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <Link
              href={user ? accountHref : "/login"}
              title={user ? userDisplayName(user) : "Sign in"}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold",
                accountActive
                  ? "bg-brand text-brand-foreground"
                  : "bg-violet-100 text-violet-700"
              )}
            >
              {loading ? "…" : user ? userInitials(user) : "?"}
            </Link>
            {user ? (
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
              {user ? userInitials(user) : "?"}
            </div>
            <div className="min-w-0 flex-1">
              {loading ? (
                <LoadingState size="xs" />
              ) : user ? (
                <>
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {userDisplayName(user)}
                  </p>
                  <Link
                    href={accountHref}
                    className={cn(
                      "text-xs hover:underline",
                      accountActive ? "font-medium text-zinc-900" : "text-zinc-500"
                    )}
                  >
                    My account
                  </Link>
                </>
              ) : (
                <>
                  <p className="truncate text-sm font-medium text-zinc-900">Guest</p>
                  <Link href="/login" className="text-xs text-zinc-500 hover:underline">
                    Sign in
                  </Link>
                </>
              )}
            </div>
            {user ? (
              <button
                type="button"
                onClick={() => void logout()}
                className="text-zinc-400 hover:text-zinc-700"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            ) : (
              <Link href="/login" className="text-zinc-400 hover:text-zinc-700" aria-label="Sign in">
                <User className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
