"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { ProjectCard } from "@/components/projects/project-card";
import { apiFetch } from "@/lib/client/api-fetch";
import type { ProjectListItem } from "@/types/project";

const LS_KEY = "abadraho_viewed_ids";
const MAX_STORED = 20;

/** Read viewed project IDs from localStorage (set by ViewedProjectsTracker). */
function readLocalViewedIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/** Save a project ID to localStorage viewed list. */
export function saveViewedId(projectId: number) {
  if (typeof window === "undefined") return;
  try {
    const existing = readLocalViewedIds();
    const updated = [projectId, ...existing.filter((id) => id !== projectId)].slice(0, MAX_STORED);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
  } catch {
    // storage full — ignore
  }
}

interface RecommendedProject extends ProjectListItem {
  recommendReason?: string;
}

export function PersonalizedProjects() {
  const [projects, setProjects] = useState<RecommendedProject[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const localIds = readLocalViewedIds();
    if (!localIds.length) {
      setLoaded(true);
      return;
    }

    apiFetch("/api/v1/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ viewedIds: localIds }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.projects)) {
          setProjects(data.projects);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || !projects.length) return null;

  return (
    <div className="mt-10 border-t border-zinc-100 pt-10">
      <div className="mb-5 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand-accent" />
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">
          Based on your browsing
        </p>
      </div>
      <h3 className="mb-5 text-xl font-semibold text-zinc-900">
        Suggested for you
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <div key={project.id} className="relative">
            <ProjectCard project={project} />
            {project.recommendReason && (
              <span className="absolute bottom-[4.5rem] left-3 z-10 rounded-full bg-brand-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-brand-accent">
                {project.recommendReason}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
