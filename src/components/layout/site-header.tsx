"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ChevronDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

const mainNav = [
  { href: "/projects", label: "Off-plan", badge: "New" },
  { href: "/projects", label: "Secondary", badge: "New" },
  { href: "/blog", label: "Developers" },
  { href: "/contact", label: "Events" },
  { href: "/login", label: "My Profile" },
  { href: "/broker", label: "Market" },
] as const;

const moreNav = [
  { href: "/admin", label: "Admin panel" },
  { href: "/compare", label: "Compare" },
  { href: "/contact", label: "User guide" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white">
      <div className="flex h-14 items-center gap-6 px-4 lg:px-5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold text-white">
            {siteConfig.name.charAt(0)}
          </span>
          <span className="hidden sm:inline">{siteConfig.name}</span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto lg:flex">
          {mainNav.map((item) => {
            const active =
              item.href === "/projects"
                ? pathname === "/projects" || pathname.startsWith("/project/")
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                )}
              >
                {item.label}
                {"badge" in item && item.badge && (
                  <span className="ml-1 inline-flex rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="group relative">
            <button
              type="button"
              className="flex items-center gap-0.5 rounded-md px-2.5 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            >
              More
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <div className="invisible absolute left-0 top-full z-50 min-w-[180px] rounded-lg border border-zinc-200 bg-white py-1 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
              {moreNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/compare"
            className="hidden text-sm font-medium text-zinc-600 hover:text-zinc-900 sm:inline"
          >
            Compare
          </Link>
          <Link
            href="/account/wishlist"
            className="hidden text-sm font-medium text-zinc-600 hover:text-zinc-900 sm:inline"
          >
            Wishlist
          </Link>
          <Link
            href="/broker"
            className="hidden rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 md:inline-block"
          >
            Connect the agency
          </Link>
          <Link
            href="/login"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100"
            aria-label="Profile"
          >
            <User className="h-4 w-4" />
          </Link>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 lg:hidden"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
