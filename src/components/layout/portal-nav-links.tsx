"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getCrossPortalLinks,
  getPortalJourney,
  isPortalLinkActive,
  resolvePortalRole,
  type PortalLink,
} from "@/config/portal-nav";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

function linkClass(active: boolean, compact: boolean) {
  return cn(
    "block rounded-lg font-medium transition-colors",
    compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
    active ? designTw.navActive : designTw.navInactive
  );
}

export function PortalNavLinks({
  userTypeId,
  role,
  variant = "sidebar",
  showJourneyHint = true,
}: {
  userTypeId?: number | null;
  role?: string | null;
  /** `inline` — auth/footer row; `sidebar` — app + admin sidebars */
  variant?: "sidebar" | "inline";
  showJourneyHint?: boolean;
}) {
  const pathname = usePathname();
  const portalRole = resolvePortalRole(userTypeId, role);
  const links = getCrossPortalLinks(userTypeId, role);
  const journey = getPortalJourney(portalRole);
  const compact = variant === "inline";

  if (portalRole === "guest") {
    return (
      <nav className={compact ? "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500" : "space-y-1"}>
        <Link href={links[0]!.href} className={compact ? "hover:text-zinc-800 hover:underline" : linkClass(isPortalLinkActive(pathname, links[0]!), false)}>
          Public site
        </Link>
      </nav>
    );
  }

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      {!compact && (
        <p className="px-1 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          Switch portal
        </p>
      )}
      <nav className={compact ? "flex flex-wrap items-center gap-x-3 gap-y-1" : "space-y-0.5"}>
        {links.map((item: PortalLink) => {
          const active = isPortalLinkActive(pathname, item);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={
                compact
                  ? cn(
                      "text-xs hover:underline",
                      active ? "font-medium text-zinc-900" : "text-zinc-500 hover:text-zinc-800"
                    )
                  : linkClass(active, false)
              }
              title={item.hint}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {showJourneyHint && !compact && journey.secondary && (
        <p className="px-1 text-[11px] text-zinc-400">
          Home:{" "}
          <Link href={journey.primary.href} className="text-zinc-600 hover:underline">
            {journey.primary.label}
          </Link>
          <span className="mx-1">·</span>
          <Link href={journey.secondary.href} className="text-zinc-600 hover:underline">
            {journey.secondary.hint ?? journey.secondary.label}
          </Link>
        </p>
      )}
    </div>
  );
}
