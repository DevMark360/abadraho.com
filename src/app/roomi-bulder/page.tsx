import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { BuilderProfileHero } from "@/components/builder/builder-profile-hero";
import { BuilderProjectsSection } from "@/components/builder/builder-projects-section";
import { BuilderReviewsSection } from "@/components/builder/builder-reviews-section";
import { JsonLd } from "@/components/seo/json-ld";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";
import { EMPTY_BUILDER_RATING_DISTRIBUTION } from "@/lib/builder-rating";
import { getSession } from "@/lib/session";
import { getBuilderPageData } from "@/server/services/builder-page.service";

const PAGE_SLUG = "roomi-builder";

export async function generateMetadata() {
  const session = await getSession();
  const data = await getBuilderPageData(PAGE_SLUG, session?.id);

  if (!data) {
    return buildPageMetadata({
      title: "Builder not found",
      path: `/${PAGE_SLUG}`,
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: `${data.profile.fullName} — Developer Profile`,
    description: data.description,
    keywords: [
      data.profile.fullName,
      `${data.profile.fullName} projects`,
      "off-plan developer Pakistan",
      "AbadRaho builder",
    ],
    path: `/${PAGE_SLUG}`,
  });
}

export default async function RoomiBuilderPage() {
  const session = await getSession();
  const data = await getBuilderPageData(PAGE_SLUG, session?.id);
  if (!data) notFound();

  const {
    profile,
    coverImageUrl,
    projects,
    totalProjects,
    projectCityCount,
    ratingAverage,
    ratingCount,
    ratingDistribution,
    reviews,
    description,
    progressFilterOptions,
  } = data;
  const returnPath = `/${PAGE_SLUG}`;

  return (
    <AppShell>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: profile.fullName,
          description,
          url: `${getSiteUrl()}/${PAGE_SLUG}`,
          ...(ratingCount > 0
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: ratingAverage.toFixed(1),
                  reviewCount: ratingCount,
                  bestRating: 5,
                  worstRating: 1,
                },
              }
            : {}),
        }}
      />

      <div className="flex-1 overflow-y-auto bg-zinc-50/60">
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
          <nav
            aria-label="Breadcrumb"
            className="mb-5 flex items-center gap-1.5 text-sm text-zinc-500"
          >
            <Link href="/" className="hover:text-zinc-900">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href="/projects" className="hover:text-zinc-900">
              Projects
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-zinc-900">{profile.fullName}</span>
          </nav>

          <BuilderProfileHero
            profile={profile}
            coverImageUrl={coverImageUrl}
            description={description}
            totalProjects={totalProjects}
            projectCityCount={projectCityCount}
            ratingAverage={ratingAverage}
            ratingCount={ratingCount}
          />

          <BuilderProjectsSection
            projects={projects}
            builderName={profile.fullName}
            progressOptions={progressFilterOptions}
          />

          <BuilderReviewsSection
            pageSlug={PAGE_SLUG}
            projects={projects.map((p) => ({ id: p.id, name: p.name, slug: p.slug }))}
            initialAverage={ratingAverage}
            initialCount={ratingCount}
            initialDistribution={ratingDistribution ?? EMPTY_BUILDER_RATING_DISTRIBUTION}
            initialReviews={reviews.map((r) => ({
              id: r.id,
              projectId: r.projectId,
              rating: r.rating,
              comment: r.comment,
              authorName: r.authorName,
              createdAt: r.createdAt?.toISOString() ?? null,
              projectName: r.projectName,
              projectSlug: r.projectSlug,
            }))}
            returnPath={returnPath}
          />
        </div>
      </div>
    </AppShell>
  );
}
