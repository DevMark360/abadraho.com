import Link from "next/link";
import { Fragment } from "react";
import { Building2, MapPin, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/config/site";
import { markPropertiesLabel, trustStats } from "@/config/trust-signals";
import { cn } from "@/lib/utils";

export function MarkPropertiesBadge({
  size = "sm",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  return <MarketedByBadge label={markPropertiesLabel} size={size} className={className} />;
}

export function MarketedByBadge({
  label,
  size = "sm",
  className,
}: {
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const name = label.trim();
  if (!name) return null;

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border border-zinc-200 bg-white font-medium leading-snug text-zinc-700 shadow-sm",
        size === "sm" && "px-2.5 py-1 text-xs",
        size === "md" && "px-3.5 py-1.5 text-sm",
        className
      )}
    >
      <Building2
        className={cn("shrink-0 text-brand-accent", size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")}
        aria-hidden
      />
      <span className="min-w-0">
        <span className="sm:hidden">
          By <span className="font-semibold text-brand-accent">{name}</span>
        </span>
        <span className="hidden sm:inline">
          Marketed by <span className="font-semibold text-brand-accent">{name}</span>
        </span>
      </span>
    </span>
  );
}

export function VerifiedListingBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-emerald-600/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm",
        className
      )}
    >
      <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden />
      Verified listing
    </span>
  );
}

export function TrustStatsRow({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-3 divide-x divide-zinc-200",
        compact ? "text-sm" : "text-base",
        className
      )}
      aria-label="AbadRaho trust signals"
    >
      {trustStats.map((stat) => (
        <div key={stat.label} className="px-3 text-center sm:px-6">
          <p
            className={cn(
              "font-semibold text-zinc-900",
              compact ? "text-lg" : "text-xl md:text-2xl"
            )}
          >
            {stat.value}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-zinc-500 md:text-sm">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

export function SiteTrustFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <TrustStatsRow compact className="mb-8" />
        <div className="flex flex-col gap-6 border-t border-zinc-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <MarkPropertiesBadge size="md" />
            <p className="flex items-center gap-1.5 text-xs text-zinc-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Karachi &amp; Pakistan off-plan property platform
            </p>
          </div>
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center justify-start gap-x-6 gap-y-2 text-sm sm:justify-end"
          >
            {[
              { href: "/about-us" as const, label: "About" },
              { href: "/contact" as const, label: "Contact" },
              { href: "/blog" as const, label: "Blog" },
              { href: "/terms-conditions" as const, label: "Terms" },
              { href: "/privacy-policy" as const, label: "Privacy" },
            ].map(({ href, label }, i) => (
              <Fragment key={href}>
                {i > 0 ? (
                  <span className="select-none text-zinc-300" aria-hidden>
                    ·
                  </span>
                ) : null}
                <Link
                  href={href}
                  className="inline-block whitespace-nowrap text-zinc-600 hover:text-zinc-900"
                >
                  {label}
                </Link>
              </Fragment>
            ))}
          </nav>
        </div>
        <p className="mt-6 text-center text-xs text-zinc-400">
          © {new Date().getFullYear()} {siteConfig.name} · Operated by {markPropertiesLabel}
        </p>
      </div>
    </footer>
  );
}
