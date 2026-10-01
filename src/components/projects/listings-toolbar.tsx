"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { LoadingDots } from "@/components/ui/loading-dots";
import { cn } from "@/lib/utils";
import { SegmentControl } from "@/components/ui/segment-control";
import { Search } from "lucide-react";

const audienceTabs = [
  { value: "all", label: "For all" },
  { value: "agent", label: "Agent" },
  { value: "agency", label: "Agency" },
  { value: "developer", label: "Developer" },
] as const;

type Audience = (typeof audienceTabs)[number]["value"];

interface ListingsToolbarProps {
  total: number;
  source?: "db" | "mock";
}

export function ListingsToolbar({ total, source }: ListingsToolbarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const audience = (searchParams.get("audience") ?? "all") as Audience;
  const q = searchParams.get("q") ?? "";

  function setAudience(value: Audience) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("audience", value);
    startTransition(() => router.push(`/projects?${params.toString()}`, { scroll: false }));
  }

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const query = String(fd.get("q") ?? "").trim();
    const params = new URLSearchParams(searchParams.toString());
    if (query) params.set("q", query);
    else params.delete("q");
    startTransition(() => router.push(`/projects?${params.toString()}`, { scroll: false }));
  }

  return (
    <div className="space-y-4 border-b border-zinc-100 pb-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.75rem]">
            Offers for you
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            <span>{total} projects</span>
            {source === "mock" && <SourceBadge tone="amber">Demo</SourceBadge>}
            {source === "db" && <SourceBadge tone="emerald">Database</SourceBadge>}
            {isPending && (
              <span className="inline-flex items-center gap-1 text-zinc-400">
                · <LoadingDots size="xs" />
              </span>
            )}
          </p>
        </div>

        <form onSubmit={onSearch} className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search…"
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-sm outline-none ring-zinc-900 transition-shadow placeholder:text-zinc-400 focus:ring-2"
          />
        </form>
      </div>

      <SegmentControl
        options={audienceTabs}
        value={audience}
        onChange={setAudience}
        className="max-w-md"
      />
    </div>
  );
}

function SourceBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "amber" | "sky" | "emerald";
}) {
  const styles = {
    amber: "bg-amber-50 text-amber-700",
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
  };
  return (
    <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-medium", styles[tone])}>
      {children}
    </span>
  );
}
