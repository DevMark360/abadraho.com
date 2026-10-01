import Link from "next/link";
import { AbadrahoLogo } from "@/components/brand/abadraho-logo";
import { AuthPortalFooter } from "@/components/auth/auth-portal-footer";
import { siteConfig } from "@/config/site";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

/**
 * Auth / onboarding layout — no sidebar (unlike in-app AppShell).
 * Split brand panel on large screens; centered card on mobile.
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
      <aside
        className="relative hidden w-[min(42%,28rem)] shrink-0 flex-col justify-between border-r border-zinc-200 bg-white p-10 lg:flex"
        aria-hidden={false}
      >
        <div>
          <AbadrahoLogo href="/" height={52} />
        </div>
        <div className="max-w-sm">
          <p className="text-xl font-semibold leading-snug text-zinc-900">{panelTitle}</p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">{panelDescription}</p>
        </div>
        <div className="text-xs text-zinc-400">
          <p className="mb-2 font-medium uppercase tracking-wider text-zinc-400">Public site</p>
          <Link href="/" className="hover:text-zinc-600 hover:underline">
            Browse off-plan listings
          </Link>
          <span className="mx-2">·</span>
          <Link href="/contact" className="hover:text-zinc-600 hover:underline">
            Contact support
          </Link>
        </div>
      </aside>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center p-6">
        <div className="mb-6 lg:hidden">
          <AbadrahoLogo href="/" height={44} />
        </div>
        {children}
        <AuthPortalFooter />
      </main>
    </div>
  );
}
