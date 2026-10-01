import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SiteTrustFooter } from "@/components/marketing/trust-signals";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className={cn("flex flex-1 flex-col overflow-y-auto", designTw.pageCanvas)}>
        <div className="flex-1">{children}</div>
        <SiteTrustFooter />
      </div>
    </AppShell>
  );
}

export function PublicPageHeader({
  title,
  subtitle,
  crumbs,
}: {
  title: string;
  subtitle?: string;
  crumbs?: { label: string; href?: string }[];
}) {
  return (
    <header className="relative border-b border-zinc-200 bg-white">
      <div className={cn(designTw.publicContainer, "py-6")}>
        {crumbs && crumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-zinc-500">
            {crumbs.map((c, i) => (
              <span key={`${c.label}-${i}`} className="inline-flex items-center gap-1">
                {i > 0 ? (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-300" aria-hidden />
                ) : null}
                {c.href ? (
                  <Link href={c.href as "/"} className="hover:text-zinc-900">
                    {c.label}
                  </Link>
                ) : (
                  <span className="font-medium text-zinc-900">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className={cn("text-2xl font-semibold text-zinc-900", crumbs?.length && "mt-2")}>
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-zinc-700 md:text-lg">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div
        className="h-px bg-gradient-to-r from-transparent via-brand/20 to-transparent"
        aria-hidden
      />
    </header>
  );
}

export function PublicPageBody({
  children,
  className,
  narrow,
}: {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <div
      className={cn(
        designTw.publicSection,
        narrow ? "mx-auto max-w-lg px-4" : designTw.publicContainer,
        className
      )}
    >
      {children}
    </div>
  );
}
