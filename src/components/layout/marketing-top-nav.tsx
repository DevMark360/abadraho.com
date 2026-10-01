"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useCallback, useEffect, useState } from "react";
import { AbadrahoLogo } from "@/components/brand/abadraho-logo";
import { Button } from "@/components/ui/button";
import { useAuth, userDisplayName, userInitials } from "@/components/auth/auth-provider";
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
    return pathname === "/projects" || pathname.startsWith("/project/");
  }
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MarketingTopNav() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
        <AbadrahoLogo href="/" height={36} className="!w-auto shrink-0" />

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                isActive(pathname, link.href)
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user && <NotificationBell className="hidden sm:inline-flex" />}

          {!mounted || loading ? (
            <div className="hidden h-9 w-20 animate-pulse rounded-lg bg-zinc-100 sm:block" />
          ) : user ? (
            <Link
              href="/account"
              className="hidden items-center gap-2 rounded-full border border-zinc-200 py-1 pl-1 pr-3 transition hover:bg-zinc-50 sm:flex"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
                {userInitials(user)}
              </span>
              <span className="max-w-[120px] truncate text-sm font-medium text-zinc-700">
                {userDisplayName(user)}
              </span>
            </Link>
          ) : (
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
          )}

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-zinc-200 bg-white lg:hidden">
          <nav className="mx-auto max-w-7xl space-y-1 px-4 py-3" aria-label="Mobile">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className={cn(
                  "block rounded-lg px-3 py-2.5 text-sm font-medium",
                  isActive(pathname, link.href)
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-700 hover:bg-zinc-50"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/contact" onClick={close}>
                  Contact
                </Link>
              </Button>
              {!mounted || loading ? (
                <div className="h-10 flex-1 animate-pulse rounded-lg bg-zinc-100" />
              ) : user ? (
                <Button asChild className="flex-1">
                  <Link href="/account" onClick={close}>
                    Account
                  </Link>
                </Button>
              ) : (
                <Button asChild className="flex-1">
                  <Link href="/login" onClick={close}>
                    Sign in
                  </Link>
                </Button>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
