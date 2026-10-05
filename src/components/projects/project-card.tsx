"use client";

import Link from "next/link";
import Image from "next/image";
import { BedDouble, Building2, MapPin, Maximize2 } from "lucide-react";
import { VerifiedListingBadge } from "@/components/marketing/trust-signals";
import {
  getMatchQualityBadge,
  getMatchQualityBadgeClass,
  shouldShowMatchedUnitPrice,
} from "@/lib/filter-match-tiers";
import { formatAreaLabel } from "@/lib/project-list-card";
import { cn, formatPrice } from "@/lib/utils";
import { ProjectCardActions } from "@/components/projects/project-card-actions";
import { ProjectCardCompareToggle } from "@/components/projects/project-card-compare-toggle";
import type { ProjectListItem } from "@/types/project";

interface ProjectCardProps {
  project: ProjectListItem;
  currency?: string;
  selected?: boolean;
}

/** Reelly.io card — cover image, location, beds, size, price from */
export function ProjectCard({
  project,
  currency = "PKR",
  selected = false,
}: ProjectCardProps) {
  const location = project.area ?? project.address ?? "";
  const matched = project.matchedUnit;
  const useMatchedPrice =
    shouldShowMatchedUnitPrice(project.matchedFilters) && matched?.price != null;
  const price = useMatchedPrice ? matched.price : project.minPrice;
  const beds = project.bedroomLabel;
  const size = formatAreaLabel(project.minAreaSqFt, project.maxAreaSqFt);
  const hasSpecs = Boolean(beds || size);

  const handoverBadge = project.handoverQuarter ?? project.handoverLabel;
  const progressBadge = project.progressName ?? null;
  const matchBadge = getMatchQualityBadge(
    project.matchScore,
    project.totalActiveFilters
  );
  const matchTier = getMatchQualityBadgeClass(
    project.matchScore,
    project.totalActiveFilters
  );

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-clay-lg border bg-clay-surface shadow-clay transition-[box-shadow,transform] duration-300 ease-in-out",
        selected
          ? "border-blue-500 ring-2 ring-blue-500/30"
          : "border-white/80 hover:-translate-y-0.5 hover:shadow-clay-hover"
      )}
    >
      <Link href={`/project/${project.slug}`} className="flex flex-1 flex-col">
        <div className="relative aspect-video overflow-hidden bg-zinc-100">
          {project.imageUrl ? (
            <Image
              src={project.imageUrl}
              alt={project.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200">
              <Building2 className="h-12 w-12 text-zinc-300" />
            </div>
          )}

          <div className="absolute left-2.5 top-2.5 flex flex-col gap-1.5">
            {progressBadge && (
              <span className="rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-zinc-800 shadow-sm">
                {progressBadge}
              </span>
            )}
            {handoverBadge && handoverBadge !== progressBadge && (
              <span className="rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-zinc-800 shadow-sm">
                {handoverBadge}
              </span>
            )}
          </div>

          <div className="absolute right-2.5 top-2.5 flex flex-col items-end gap-1.5">
            <VerifiedListingBadge />
            {project.saleBadge ? (
              <span className="rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-zinc-800 shadow-sm">
                {project.saleBadge}
              </span>
            ) : null}
          </div>

          {project.advised && (
            <span className="absolute bottom-2.5 right-2.5 rounded-md bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">
              Advised
            </span>
          )}

          {matchBadge && (
            <span
              className={cn(
                "absolute bottom-2.5 left-2.5 max-w-[calc(100%-1.25rem)] rounded-lg px-2.5 py-1 text-[11px] font-semibold leading-tight text-white shadow-sm",
                matchTier === "perfect" && "bg-emerald-600",
                matchTier === "excellent" && "bg-sky-600",
                matchTier === "great" && "bg-indigo-600",
                matchTier === "similar" && "bg-amber-600"
              )}
            >
              {matchBadge}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-clay-line p-4">
          <div>
            <h3 className="line-clamp-1 text-base font-bold text-zinc-900">
              {project.name}
            </h3>

            {location ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-zinc-700">
                <MapPin className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                <span className="line-clamp-1">{location}</span>
              </p>
            ) : null}
          </div>

          {hasSpecs ? (
            <div className="flex flex-wrap gap-1.5">
              {beds ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-clay-well px-2.5 py-1.5 text-xs font-semibold text-zinc-800 shadow-clay-inset">
                  <BedDouble className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                  {beds}
                </span>
              ) : null}
              {size ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-clay-well px-2.5 py-1.5 text-xs font-semibold text-zinc-800 shadow-clay-inset">
                  <Maximize2 className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
                  {size}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </Link>

      <div className="flex items-baseline justify-between gap-2 border-t border-clay-line px-4 py-3">
        <span className="text-sm font-medium text-zinc-600">
          {useMatchedPrice ? "Matched price" : "Price from"}
        </span>
        <span className="text-right text-base font-bold text-zinc-900">
          {price != null ? formatPrice(price, currency) : "On request"}
        </span>
      </div>

      <div className="border-t border-clay-line px-4 py-3">
        <ProjectCardCompareToggle projectId={project.id} slug={project.slug} />
      </div>

      <div className="absolute right-2 top-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
        <ProjectCardActions projectId={project.id} slug={project.slug} />
      </div>
    </article>
  );
}
