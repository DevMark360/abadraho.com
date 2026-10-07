"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Heart, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useCallback, useEffect, useRef, useState } from "react";
import { AbadrahoLogo } from "@/components/brand/abadraho-logo";
import { Button } from "@/components/ui/button";
import { useAuth, userDisplayName, userInitials } from "@/components/auth/auth-provider";
import { getAccountHomePath } from "@/config/account-nav";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

const links = [
  { href: "/projects", label: "Projects" },
  { href: "/compare", label: "Compare" },
  { href: "/about-us", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/events", label: "Events" },
  { href: "/contact", label: "Contact" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/projects") {
    return (
      pathname === "/projects" ||
      pathname.startsWith("/project/") ||
      pathname.startsWith("/area/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Home page top navigation — a floating clay bar (inset like the cards below it). Signed-in
 * users get a menu with their role's account home, saved projects and log out. All other
 * pages use the sidebar (AppShell).
 */
export function MarketingTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const [open, setOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  const accountHref = user ? getAccountHomePath(user.userTypeId, user.role) : "/account";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
    setUserMenu(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!userMenu) return;
    const onDown = (e: MouseEvent) => {
      if (!userMenuRef.current?.contains(e.target as Node)) setUserMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUserMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [userMenu]);

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST", credentials: "same-origin" });
    await refresh();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <div
        className={cn(
          designTw.publicCard,
          "mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 bg-clay-surface/90 px-3 backdrop-blur-md sm:h-16 sm:px-5"
        )}
      >
        {/* 40px in the 56px phone bar, 48px in the 64px bar from sm up. */}
        <AbadrahoLogo
          href="/"
          height={48}
          className="!w-auto shrink-0"
          imgClassName="!h-10 sm:!h-12"
        />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              className={cn(
                "rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                isActive(pathname, link.href) ? designTw.navActive : designTw.navInactive
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user && <NotificationBell className="hidden sm:inline-flex" />}

          {!mounted || loading ? (
            <div className="hidden h-10 w-24 animate-pulse rounded-2xl bg-clay-well sm:block" />
          ) : user ? (
            <div ref={userMenuRef} className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setUserMenu((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={userMenu}
                className="flex items-center gap-2 rounded-full border border-white/80 bg-clay-surface py-1 pl-1 pr-3 shadow-clay-sm transition-shadow hover:shadow-clay"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-zinc-700 to-zinc-900 text-xs font-semibold text-white">
                  {userInitials(user)}
                </span>
                <span className="max-w-[120px] truncate text-sm font-medium text-zinc-700">
                  {userDisplayName(user)}
                </span>
                <ChevronDown
                  className={cn("h-4 w-4 text-zinc-400 transition-transform", userMenu && "rotate-180")}
                  aria-hidden
                />
              </button>
              {userMenu ? (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-52 rounded-2xl border border-white/80 bg-clay-surface p-1.5 shadow-clay"
                >
                  <Link
                    href={accountHref as "/account"}
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-zinc-700 hover:bg-clay-well"
                  >
                    <LayoutDashboard className="h-4 w-4 text-zinc-500" aria-hidden />
                    My account
                  </Link>
                  <Link
                    href="/account/wishlist"
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-zinc-700 hover:bg-clay-well"
                  >
                    <Heart className="h-4 w-4 text-zinc-500" aria-hidden />
                    Saved projects
                  </Link>
                  <div className="my-1 h-px bg-clay-line" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void logout()}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-clay-well"
                  >
                    <LogOut className="h-4 w-4 text-zinc-500" aria-hidden />
                    Log out
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
          )}

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-clay-surface text-zinc-700 shadow-clay-sm lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className={cn(designTw.publicCard, "mx-auto mt-2 max-w-7xl lg:hidden")}>
          <nav className="space-y-1 p-3" aria-label="Mobile">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className={cn(
                  "block rounded-xl px-3 py-2.5 text-sm font-medium",
                  isActive(pathname, link.href) ? designTw.navActive : designTw.navInactive
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {!mounted || loading ? (
                <div className="col-span-2 h-11 animate-pulse rounded-2xl bg-clay-well" />
              ) : user ? (
                <>
                  <Button asChild>
                    <Link href={accountHref as "/account"} onClick={close}>
                      My account
                    </Link>
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void logout()}>
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild>
                    <Link href="/login" onClick={close}>
                      Sign in
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/login?tab=register" onClick={close}>
                      Create account
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
