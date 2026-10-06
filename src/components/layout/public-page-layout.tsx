import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
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
 * white band). Split layout: text on the left, `aside` on the right — a useful panel
 * (actions, stats, topics) so wide screens don't leave an empty card. `children` renders
 * under the subtitle.
 */
export function PublicPageHeader({
  title,
  subtitle,
  crumbs,
  eyebrow,
  aside,
  children,
}: {
  title: string;
  subtitle?: string;
  crumbs?: { label: string; href?: string }[];
  eyebrow?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={cn(designTw.publicContainer, "pt-4 sm:pt-6")}>
      <header
        className={cn(
          designTw.publicCard,
          "grid gap-6 px-5 py-6 sm:px-8 sm:py-7",
          aside && "lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center lg:gap-10"
        )}
      >
        <div className="min-w-0">
          {/* Visible trail + BreadcrumbList JSON-LD from the same crumbs. */}
          {crumbs && crumbs.length > 0 ? <Breadcrumbs crumbs={crumbs} /> : null}
          {eyebrow ? (
            <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-brand-accent">
              {eyebrow}
            </div>
          ) : null}
          <h1
            className={cn(
              "text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl",
              eyebrow ? "mt-1.5" : crumbs?.length ? "mt-3" : undefined
            )}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-600">{subtitle}</p>
          ) : null}
          {children ? <div className="mt-5">{children}</div> : null}
        </div>
        {aside ? <div className={cn(designTw.clayWell, "p-5")}>{aside}</div> : null}
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
