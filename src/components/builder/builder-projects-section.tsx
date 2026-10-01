"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, ChevronRight, SlidersHorizontal } from "lucide-react";
import { ProjectCard } from "@/components/projects/project-card";
import { Select } from "@/components/ui/select";
import type { ProjectListItem } from "@/types/project";

export function BuilderProjectsSection({
  projects,
  builderName,
  progressOptions,
}: {
  projects: ProjectListItem[];
  builderName: string;
  progressOptions: { value: string; label: string }[];
}) {
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    if (statusFilter === "all") return projects;
    return projects.filter(
      (p) => (p.progressName ?? p.statusBadge ?? "").trim() === statusFilter
    );
  }, [projects, statusFilter]);

  return (
    <section className="mt-10">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 sm:text-2xl">Projects</h2>
          <p className="mt-1 text-sm text-zinc-600">
            {filtered.length} of {projects.length} listings by {builderName}
          </p>
        </div>

        {progressOptions.length > 0 ? (
          <label className="flex w-full flex-col gap-1.5 sm:w-auto sm:min-w-[220px]">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Project status
            </span>
            <Select
              layout="field"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white"
            >
              <option value="all">All statuses</option>
              {progressOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </label>
        ) : null}
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : projects.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 py-12 text-center">
          <p className="font-medium text-zinc-600">No projects match this status filter.</p>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className="mt-3 text-sm font-semibold text-brand-accent hover:underline"
          >
            Show all projects
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 py-14 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
          <p className="font-medium text-zinc-500">No live projects listed yet.</p>
          <Link
            href="/projects"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-accent hover:underline"
          >
            Browse all projects
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}
