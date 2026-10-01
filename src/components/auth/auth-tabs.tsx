"use client";

import Link from "next/link";
import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type AuthTab = "signin" | "register";

function authHref(tab: AuthTab, ref: string | null) {
  const params = new URLSearchParams();
  if (tab === "register") params.set("tab", "register");
  if (ref) params.set("ref", ref);
  const q = params.toString();
  return q ? `/login?${q}` : "/login";
}

export function AuthTabs({ active }: { active: AuthTab }) {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  const tabClass = (tab: AuthTab) =>
    cn(
      "flex-1 rounded-lg py-2 text-center text-sm font-medium transition-colors",
      active === tab
        ? "bg-brand text-brand-foreground"
        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
    );

  return (
    <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1">
      <Link href={authHref("signin", ref) as Route} className={tabClass("signin")}>
        Sign in
      </Link>
      <Link href={authHref("register", ref) as Route} className={tabClass("register")}>
        Create account
      </Link>
    </div>
  );
}
