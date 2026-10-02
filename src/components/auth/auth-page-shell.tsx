import Link from "next/link";
import { BadgeCheck, GitCompare, Headphones, Heart } from "lucide-react";
import { AbadrahoLogo } from "@/components/brand/abadraho-logo";
import { AuthPortalFooter } from "@/components/auth/auth-portal-footer";
import { MarkPropertiesBadge } from "@/components/marketing/trust-signals";
import { siteConfig } from "@/config/site";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

const BENEFITS = [
  { icon: BadgeCheck, title: "Verified listings", text: "Off-plan projects across Karachi and Pakistan" },
  { icon: GitCompare, title: "Compare side by side", text: "Payment plans, handover dates, and unit prices" },
  { icon: Heart, title: "Save your shortlist", text: "Wishlists and recently viewed projects in one place" },
  { icon: Headphones, title: "Free advisor support", text: "Guidance from the Mark Properties team" },
] as const;

/**
 * Auth / onboarding layout — no sidebar (unlike in-app AppShell).
 * Brand + benefits panel on large screens; logo above a centered card on smaller screens.
 * The logo lives here (not in the card) so it shows exactly once at every breakpoint.
 */
export function AuthPageShell({
  children,
  panelTitle = siteConfig.tagline,
  panelDescription = "Sign in to save wishlists, compare projects, and manage your account.",
}: {
  children: React.ReactNode;
  panelTitle?: string;
  panelDescription?: string;
}) {
  return (
    <div className={cn("flex min-h-screen", designTw.pageCanvas)}>
      <aside className="relative hidden w-[min(42%,30rem)] shrink-0 flex-col justify-between overflow-hidden border-r border-zinc-200 bg-gradient-to-br from-white via-white to-red-50/60 p-10 lg:flex xl:p-12">
        <div
          className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand-accent/5"
          aria-hidden
        />
        <AbadrahoLogo href="/" height={52} />

        <div className="relative max-w-sm">
          <h2 className="text-2xl font-bold leading-tight tracking-tight text-zinc-900 xl:text-3xl">
            {panelTitle}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">{panelDescription}</p>
          <ul className="mt-8 space-y-5">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-accent" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold text-zinc-900">{title}</span>
                  <span className="block text-sm text-zinc-500">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
          <MarkPropertiesBadge />
          <span>
            <Link href="/" className="hover:text-zinc-800 hover:underline">
              Browse listings
            </Link>
            <span className="mx-2">·</span>
            <Link href="/contact" className="hover:text-zinc-800 hover:underline">
              Contact support
            </Link>
          </span>
        </div>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 lg:hidden">
          <AbadrahoLogo href="/" height={44} />
        </div>
        {children}
        <div className="lg:hidden">
          <AuthPortalFooter />
        </div>
      </main>
    </div>
  );
}
