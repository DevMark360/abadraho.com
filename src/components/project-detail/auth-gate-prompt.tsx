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
          ? "rounded-clay-lg bg-clay-well shadow-clay-inset"
          : "bg-clay-well"
      )}
    >
      <Lock className="mx-auto h-6 w-6 text-brand-accent" aria-hidden />
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
