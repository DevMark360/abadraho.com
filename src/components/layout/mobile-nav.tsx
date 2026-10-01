"use client";

import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { createPortal } from "react-dom";
import { AbadrahoLogo } from "@/components/brand/abadraho-logo";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import type { AppShellSidebar } from "@/components/layout/app-shell";

const MENU_ID = "mobile-nav-menu";

export function MobileNav({ sidebar = "public" }: { sidebar?: AppShellSidebar }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const labelId = useId();

  const isStaff =
    sidebar === "staff" || pathname.startsWith("/admin");
  const Side = isStaff ? AdminSidebar : AppSidebar;
  const logoHref = isStaff ? "/admin/dashboard" : "/";

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    const drawer = drawerRef.current;
    const focusable = drawer?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
      toggleRef.current?.focus();
    };
  }, [open, close]);

  const drawerPortal =
    mounted && open
      ? createPortal(
          <div className="mobile-nav-overlay is-open lg:hidden" aria-hidden={false}>
            <button
              type="button"
              className="mobile-nav-backdrop"
              onClick={close}
              aria-label="Close menu"
            />
            <nav
              id={MENU_ID}
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={labelId}
              className="mobile-nav-drawer"
              tabIndex={-1}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a")) close();
              }}
            >
              <p id={labelId} className="sr-only">
                Site navigation
              </p>
              <Side />
            </nav>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <header className="relative h-14 shrink-0 border-b border-zinc-200 bg-white lg:hidden">
        <div className="flex h-full items-center px-3 pr-14">
          <div className="min-w-0 max-w-full overflow-hidden">
            <AbadrahoLogo
              href={logoHref}
              height={28}
              className="max-w-full"
              imgClassName="!h-7 !max-h-7 !w-auto"
            />
          </div>
        </div>

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-800 hover:bg-zinc-100"
          aria-expanded={open}
          aria-controls={MENU_ID}
          aria-haspopup="dialog"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? (
            <X className="h-5 w-5" aria-hidden />
          ) : (
            <Menu className="h-5 w-5" aria-hidden />
          )}
        </button>
      </header>
      {drawerPortal}
    </>
  );
}
