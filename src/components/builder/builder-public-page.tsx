import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BuilderProfileHero } from "@/components/builder/builder-profile-hero";
import { BuilderProjectsSection } from "@/components/builder/builder-projects-section";
import { BuilderReviewsSection } from "@/components/builder/builder-reviews-section";
import { JsonLd } from "@/components/seo/json-ld";
import { builderPublicPath } from "@/config/builder-pages";
import { EMPTY_BUILDER_RATING_DISTRIBUTION } from "@/lib/builder-rating";
import { getSiteUrl } from "@/lib/seo";
import type { BuilderPageData } from "@/server/services/builder-page.service";

export function BuilderPublicPage({ data }: { data: BuilderPageData }) {
  const {
    pageSlug,
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
  const returnPath = builderPublicPath(pageSlug);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: profile.fullName,
          description,
          url: `${getSiteUrl()}${returnPath}`,
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
            pageSlug={pageSlug}
            projects={projects.map((project) => ({
              id: project.id,
              name: project.name,
              slug: project.slug,
            }))}
            initialAverage={ratingAverage}
            initialCount={ratingCount}
            initialDistribution={ratingDistribution ?? EMPTY_BUILDER_RATING_DISTRIBUTION}
            initialReviews={reviews.map((review) => ({
              id: review.id,
              projectId: review.projectId,
              rating: review.rating,
              comment: review.comment,
              authorName: review.authorName,
              createdAt: review.createdAt?.toISOString() ?? null,
              projectName: review.projectName,
              projectSlug: review.projectSlug,
            }))}
            returnPath={returnPath}
          />
        </div>
      </div>
    </>
  );
}
