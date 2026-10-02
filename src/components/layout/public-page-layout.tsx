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

/**
 * Page title block as a floating clay card (inset like the sidebar, never an edge-to-edge
 * white band). `children` renders under the subtitle — e.g. key points or actions.
 */
export function PublicPageHeader({
  title,
  subtitle,
  crumbs,
  eyebrow,
  children,
}: {
  title: string;
  subtitle?: string;
  crumbs?: { label: string; href?: string }[];
  eyebrow?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={cn(designTw.publicContainer, "pt-4 sm:pt-6")}>
      <header className={cn(designTw.publicCard, "relative overflow-hidden px-5 py-6 sm:px-8 sm:py-8")}>
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-accent/[0.06] blur-2xl"
          aria-hidden
        />
        {crumbs && crumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="relative flex flex-wrap items-center gap-1 text-sm text-zinc-500">
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
        {eyebrow ? (
          <div className="relative mt-4 text-xs font-semibold uppercase tracking-wider text-brand-accent">
            {eyebrow}
          </div>
        ) : null}
        <h1
          className={cn(
            "relative text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl",
            eyebrow ? "mt-1.5" : crumbs?.length ? "mt-3" : undefined
          )}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="relative mt-3 max-w-3xl text-base leading-relaxed text-zinc-600 md:text-lg">
            {subtitle}
          </p>
        ) : null}
        {children ? <div className="relative mt-5">{children}</div> : null}
      </header>
    </div>
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
