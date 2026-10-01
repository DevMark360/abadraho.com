"use client";

import Link from "next/link";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuth } from "@/components/auth/auth-provider";
import { getAccountNavSections, isBuilderUserType } from "@/config/account-nav";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";
import { BuilderAccountHubClient } from "@/components/account/builder-account-hub-client";

export function AccountHubClient() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingState size="sm" label="Loading your account…" />;
  }

  if (!user) {
    return (
      <div className={cn(designTw.publicCard, "p-8 text-center")}>
        <p className="font-medium text-zinc-900">Sign in to view your account</p>
        <Link
          href="/login?ref=/account"
          className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (isBuilderUserType(user.userTypeId)) {
    return <BuilderAccountHubClient user={user} />;
  }

  const sections = getAccountNavSections(user.userTypeId, user.role);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">My account</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Profile, preferences, and saved listings
        </p>
      </div>

      {sections.map((section) => (
        <section key={section.id}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            {section.label}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {section.items.map((item) => (
              <li key={`${section.id}-${item.href}-${item.label}`}>
                {item.download ? (
                  <a
                    href={item.href}
                    download
                    className={cn(
                      designTw.publicCard,
                      "block px-4 py-3.5 text-sm font-medium text-zinc-800 transition hover:border-zinc-300 hover:shadow-md"
                    )}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    href={item.href as "/account"}
                    className={cn(
                      designTw.publicCard,
                      "block px-4 py-3.5 text-sm font-medium text-zinc-800 transition hover:border-zinc-300 hover:shadow-md"
                    )}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
