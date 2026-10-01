"use client";

import Link from "next/link";
import Image from "next/image";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Marquee } from "@/components/ui/marquee";
import { VerifiedListingBadge } from "@/components/marketing/trust-signals";
import { cn, formatPrice } from "@/lib/utils";
import type { ProjectListItem } from "@/types/project";

function FeaturedScrollerCard({
  project,
  currency = "PKR",
}: {
  project: ProjectListItem;
  currency?: string;
}) {
  const location = project.area ?? project.address ?? "";
  const devLine = [location, project.builderName ? `by ${project.builderName}` : ""]
    .filter(Boolean)
    .join(" • ");

  return (
    <article
      className={cn(
        "flex h-full w-[min(78vw,280px)] shrink-0 snap-start flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm",
        "sm:w-[300px] md:w-[320px]"
      )}
    >
      <div className="relative mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-white bg-zinc-100 shadow-md ring-1 ring-zinc-200">
        {project.imageUrl ? (
          <Image
            src={project.imageUrl}
            alt={project.name}
            fill
            className="object-cover"
            sizes="112px"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200">
            <Building2 className="h-10 w-10 text-zinc-300" />
          </div>
        )}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <VerifiedListingBadge className="scale-90" />
        </div>
      </div>

      <h3 className="mt-5 line-clamp-2 min-h-[2.75rem] text-center text-base font-semibold leading-snug text-zinc-900">
        {project.name}
      </h3>
      <p className="mt-1.5 line-clamp-2 min-h-[2.5rem] text-center text-xs leading-relaxed text-zinc-500">
        {devLine || "\u00A0"}
      </p>
      <p className="mt-3 shrink-0 text-center text-sm font-bold text-zinc-900">
        {project.minPrice ? formatPrice(project.minPrice, currency) : "Price on request"}
      </p>

      <div className="mt-auto flex flex-col gap-2 pt-4">
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link href={`/project/${project.slug}`}>View Details</Link>
        </Button>
        <Button asChild variant="accent" size="sm" className="w-full">
          <Link href={`/project/${project.slug}#inquiry`}>Interested</Link>
        </Button>
      </div>
    </article>
  );
}

export function FeaturedProjectsScroller({
  projects,
  currency = "PKR",
}: {
  projects: ProjectListItem[];
  currency?: string;
}) {
  if (projects.length === 0) return null;

  // Fewer than 4 cards never fills the viewport, so there's no room for the
  // marquee to loop without a visible jump — fall back to a static row.
  if (projects.length < 4) {
    return (
      <div className="flex flex-wrap items-stretch justify-center gap-4 px-1 py-1">
        {projects.map((project) => (
          <FeaturedScrollerCard key={project.id} project={project} currency={currency} />
        ))}
      </div>
    );
  }

  return (
    <Marquee className="py-1" trackClassName="items-stretch">
      {projects.map((project) => (
        <FeaturedScrollerCard key={project.id} project={project} currency={currency} />
      ))}
    </Marquee>
  );
}
