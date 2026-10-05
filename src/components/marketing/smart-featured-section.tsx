"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { FeaturedProjectsScroller } from "@/components/marketing/featured-projects-scroller";
import { apiFetch } from "@/lib/client/api-fetch";
import { readLocalViewedIds } from "@/lib/client/viewed-projects";
import type { ProjectListItem } from "@/types/project";

interface RecommendedProject extends ProjectListItem {
  recommendReason?: string;
}

type Mode = "featured" | "personalized";

export function SmartFeaturedSection({
  defaultProjects,
}: {
  defaultProjects: ProjectListItem[];
}) {
  const [projects, setProjects] = useState<ProjectListItem[]>(defaultProjects);
  const [mode, setMode] = useState<Mode>("featured");
  const [reason, setReason] = useState<string>("");

  useEffect(() => {
    const localIds = readLocalViewedIds();
    if (!localIds.length) return;

    apiFetch("/api/v1/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ viewedIds: localIds }),
    })
      .then((res) => res.json())
      .then((data: { success: boolean; projects: RecommendedProject[] }) => {
        if (data.success && data.projects.length >= 3) {
          setProjects(data.projects);
          setMode("personalized");
          // Pick most common reason from results
          const reasons = data.projects
            .map((p) => p.recommendReason)
            .filter(Boolean) as string[];
          const freq: Record<string, number> = {};
          for (const r of reasons) freq[r] = (freq[r] ?? 0) + 1;
          const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
          setReason(top ?? "");
        }
      })
      .catch(() => undefined);
  }, []);

  const isPersonalized = mode === "personalized";

  return (
    <>
      {/* Dynamic header */}
      <div className="mb-8 flex items-end justify-between gap-4 md:mb-10">
        <div>
          {isPersonalized ? (
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-accent">
              <Sparkles className="h-3.5 w-3.5" />
              Based on your browsing
            </p>
          ) : (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-accent">
              Primary focus
            </p>
          )}

          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
            {isPersonalized ? "Suggested for you" : "Featured off-plan projects"}
          </h2>

          <p className="mt-2 max-w-2xl text-base leading-relaxed text-zinc-600">
            {isPersonalized
              ? reason
                ? `Projects matching your interest: ${reason.toLowerCase()}`
                : "Projects that match your recent browsing history."
              : "Hand-picked developments with strong builder credentials across Karachi."}
          </p>
        </div>

        {projects.length > 0 ? (
          <Link
            href="/projects"
            className="shrink-0 text-sm font-semibold text-brand-accent hover:underline"
          >
            See all
          </Link>
        ) : null}
      </div>

      {/* Scroller — same window, content switches */}
      <FeaturedProjectsScroller projects={projects} />
    </>
  );
}
