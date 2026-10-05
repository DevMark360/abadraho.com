"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Map, LayoutGrid, Heart } from "lucide-react";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";

export function ListingsTopBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const view = searchParams.get("view") ?? "list";

  function setParam(key: string, value: string | null) {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    startTransition(() => router.push(`/projects?${p.toString()}`, { scroll: false }));
  }

  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 px-3 pt-3 sm:px-4 lg:px-6",
        pending && "opacity-80"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex rounded-2xl bg-clay-well p-1 shadow-clay-inset">
          <button
            type="button"
            onClick={() => setParam("view", "map")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
              view === "map" ? designTw.navActive : "text-zinc-600 hover:text-zinc-900"
            )}
          >
            <Map className="h-4 w-4" />
            Map
          </button>
          <button
            type="button"
            onClick={() => setParam("view", "list")}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
              view !== "map" ? designTw.navActive : "text-zinc-600 hover:text-zinc-900"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            List
          </button>
        </div>

        <Link
          href="/account/wishlist"
          className="flex items-center gap-1.5 rounded-2xl border border-white/80 bg-clay-surface px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-clay-sm transition-shadow hover:shadow-clay"
        >
          <Heart className="h-4 w-4" />
          Saved
        </Link>
      </div>
    </div>
  );
}
