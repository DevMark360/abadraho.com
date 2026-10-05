import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Building2, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ProjectCard } from "@/components/projects/project-card";
import { JsonLd } from "@/components/seo/json-ld";
import { buildAreaSchema } from "@/lib/schema-markup";
import { buildPageMetadata } from "@/lib/seo";
import { getAreaPageData } from "@/server/services/area-page.service";
import { getSession } from "@/lib/session";
import { getSlotRotation } from "@/server/services/ad-serving.service";
import {
  RotatingFeaturedSection,
  RotatingBannerSection,
  RotatingContentSection,
} from "@/components/advertising/ad-rotation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function areaDescription(areaName: string, cityName: string, count: number): string {
  return `Browse ${count > 0 ? count : "all"} off-plan ${count === 1 ? "project" : "projects"} in ${areaName}, ${cityName}. Compare payment plans, prices, and builders on AbadRaho.`;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const data = await getAreaPageData(slug);

  if (!data) {
    return buildPageMetadata({
      title: "Area not found",
      path: `/area/${slug}`,
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: `Off-plan Properties in ${data.area.name}`,
    description: areaDescription(data.area.name, data.area.cityName ?? "Karachi", data.total),
    keywords: [
      `${data.area.name} off-plan properties`,
      `${data.area.name} real estate`,
      `${data.area.name} apartments`,
      `${data.area.name} housing projects`,
      "Pakistan property",
    ],
    path: `/area/${slug}`,
  });
}

export default async function AreaPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await getSession();
  const data = await getAreaPageData(slug, session?.id);
  if (!data) notFound();

  const { area, projects, total } = data;
  const cityName = area.cityName ?? "Karachi";
  const description = areaDescription(area.name, cityName, total);

  const [featuredRotation, bannerRotation, contentRotation] = await Promise.all([
    getSlotRotation("featured_listing", area.id, null),
    getSlotRotation("banner", area.id, null),
    getSlotRotation("sponsored_content", area.id, null),
  ]);

  return (
    <AppShell>
      <JsonLd
        data={buildAreaSchema({
          name: area.name,
          slug: area.slug,
          description,
          projectCount: total,
          cityName,
        })}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-sm text-zinc-500">
            <Link href="/" className="hover:text-zinc-900">Home</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/projects" className="hover:text-zinc-900">Projects</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-zinc-900 font-medium">{area.name}</span>
          </nav>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-5 w-5 text-brand-accent shrink-0" />
              <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
                Off-plan Properties in {area.name}
              </h1>
            </div>
            <p className="text-zinc-600 max-w-2xl">{description}</p>
            <div className="mt-3 flex items-center gap-2 text-sm text-zinc-500">
              <Building2 className="h-4 w-4" />
              <span>
                {total > 0
                  ? `${total} ${total === 1 ? "project" : "projects"} available`
                  : "No projects listed yet"}
              </span>
            </div>
          </div>

          <RotatingFeaturedSection rotation={featuredRotation} />
          <RotatingBannerSection rotation={bannerRotation} />
          <RotatingContentSection rotation={contentRotation} />

          {/* Project grid */}
          {projects.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 py-16 text-center">
              <Building2 className="mx-auto h-10 w-10 text-zinc-300 mb-3" />
              <p className="text-zinc-500 font-medium">No projects in {area.name} yet.</p>
              <Link
                href="/projects"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-accent hover:underline"
              >
                Browse all projects
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}

          {/* Footer note */}
          {projects.length > 0 && (
            <p className="mt-8 text-center text-xs text-zinc-400">
              Showing {projects.length} of {total} projects in {area.name} ·{" "}
              <Link href="/projects" className="underline hover:text-zinc-600">
                View all projects
              </Link>
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
