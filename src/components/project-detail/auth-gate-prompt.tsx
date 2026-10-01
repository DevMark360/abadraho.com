"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AuthGatePrompt({
  title = "Register or sign in to view this",
  description,
  returnPath,
  variant = "card",
}: {
  title?: string;
  description?: string;
  returnPath: string;
  variant?: "card" | "inline";
}) {
  const ref = encodeURIComponent(returnPath);

  return (
    <div
      className={cn(
        "px-6 py-8 text-center",
        variant === "card"
          ? "rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80"
          : "bg-zinc-50/80"
      )}
    >      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
        <Lock className="h-5 w-5 text-zinc-400" />
      </div>
      <p className="mt-4 text-sm font-medium text-zinc-900">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">{description}</p>
      ) : null}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button asChild size="sm">
          <Link href={`/login?ref=${ref}`}>Sign in</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/login?tab=register&ref=${ref}`}>Register</Link>
        </Button>
      </div>
    </div>
  );
}
