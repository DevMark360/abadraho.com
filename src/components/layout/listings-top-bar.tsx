"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Map, LayoutGrid, Heart } from "lucide-react";
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
        "flex items-center justify-end gap-2 border-b border-zinc-100 bg-white px-4 py-3 lg:px-6",
        pending && "opacity-80"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-zinc-200 p-0.5">
          <button
            type="button"
            onClick={() => setParam("view", "map")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
              view === "map" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50"
            )}
          >
            <Map className="h-4 w-4" />
            Map
          </button>
          <button
            type="button"
            onClick={() => setParam("view", "list")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
              view !== "map" ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            List
          </button>
        </div>

        <Link
          href="/account/wishlist"
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <Heart className="h-4 w-4" />
          Saved
        </Link>
      </div>
    </div>
  );
}
