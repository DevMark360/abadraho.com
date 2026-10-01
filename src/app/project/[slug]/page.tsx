import "@/styles/font-awesome-local.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Star } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { formatPrice } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { getProjectDetail } from "@/server/services/project-detail.service";
import { canUserViewTeamScopedProject } from "@/server/services/admin-team.service";
import { AuthGatePrompt } from "@/components/project-detail/auth-gate-prompt";
import { ProjectUnitsSection } from "@/components/project-detail/project-units-section";
import { InquiryForm } from "@/components/project-detail/inquiry-form";
import { PaymentScheduleSection } from "@/components/project-detail/payment-schedule-section";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectDetailActions } from "@/components/project-detail/project-detail-actions";
import { ReviewsSection } from "@/components/project-detail/reviews-section";
import { ProjectViewTracker } from "@/components/project-detail/project-view-tracker";
import { TrackedSection } from "@/components/project-detail/tracked-section";
import { SanitizedHtml } from "@/components/ui/sanitized-html";
import { RecentViewsSection } from "@/components/project-detail/recent-views-section";
import { VoucherButton } from "@/components/project-detail/voucher-button";
import { ProjectGallery } from "@/components/project-detail/project-gallery";
import { ProjectFeatures } from "@/components/project-detail/project-features";
import { ProjectMediaSection } from "@/components/project-detail/project-media-section";
import { ProjectAttachmentsSection } from "@/components/project-detail/project-attachments-section";
import { ProjectLocationMap } from "@/components/project-detail/project-location-map";
import { ProjectHighlightsSection } from "@/components/project-detail/project-highlights-section";
import { ProjectGeoSummary } from "@/components/project-detail/project-geo-summary";
import {
  MarketedByBadge,
  VerifiedListingBadge,
} from "@/components/marketing/trust-signals";
import { JsonLd } from "@/components/seo/json-ld";
import { buildProductSchema, buildRealEstateListingSchema } from "@/lib/schema-markup";
import { buildPageMetadata } from "@/lib/seo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function projectDescription(project: {
  name: string;
  area: string | null;
  projectTypeName: string | null;
  metaDescription: string | null;
  minPrice: number | null;
}): string {
  const custom = project.metaDescription?.trim();
  if (custom) return custom;

  const parts = [
    project.name,
    project.area,
    project.projectTypeName,
    project.minPrice != null ? `from PKR ${project.minPrice.toLocaleString("en-PK")}` : null,
  ].filter(Boolean);

  return parts.join(" — ");
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const project = await getProjectDetail(slug);
  if (!project) {
    return buildPageMetadata({
      title: "Project not found",
      path: `/project/${slug}`,
      noIndex: true,
    });
  }

  return buildPageMetadata({
    title: project.metaTitle?.trim() || project.name,
    description: projectDescription(project),
    keywords: project.metaKeywords?.trim() || undefined,
    path: `/project/${slug}`,
    image: project.galleryImages[0] ?? project.imageUrl,
    imageAlt: project.name,
    type: "article",
  });
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [project, session] = await Promise.all([getProjectDetail(slug), getSession()]);
  if (!project) notFound();
  if (session?.id && !(await canUserViewTeamScopedProject(session.id, project.id))) {
    notFound();
  }

  const galleryImages =
    project.galleryImages.length > 0
      ? project.galleryImages
      : project.imageUrl
        ? [project.imageUrl]
        : [];

  const schemaDescription = projectDescription(project);

  return (
    <AppShell>
      <JsonLd
        data={buildRealEstateListingSchema({
          name: project.name,
          slug: project.slug,
          description: schemaDescription,
          imageUrl: project.imageUrl,
          galleryImages: galleryImages,
          minPrice: project.minPrice,
          maxPrice: project.maxPrice,
          address: project.address,
          area: project.areaNames ?? project.area,
          latitude: project.latitude,
          longitude: project.longitude,
          builderName: project.builderName,
          builderNames: project.builderNames,
          projectTypeName: project.projectTypeName,
          ratingAverage: project.ratingAverage,
          ratingCount: project.ratingCount,
        })}
      />
      <ProjectViewTracker projectId={project.id} projectName={project.name} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
          <Link
            href="/projects"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Off-plan
          </Link>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                <div className="p-4 pb-0">
                  <TrackedSection section="gallery" projectId={project.id}>
                    <ProjectGallery images={galleryImages} />
                  </TrackedSection>
                </div>
                <div className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h1 className="text-2xl font-semibold text-zinc-900">
                        {project.name}
                      </h1>
                      <p className="mt-1 text-sm text-zinc-500">
                        {[
                          project.areaNames ?? project.area,
                          project.builderNames.length
                            ? `by ${project.builderNames.join(", ")}`
                            : project.builderName && `by ${project.builderName}`,
                          project.projectTypeName,
                          project.progressName,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                      {project.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {project.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ProjectDetailActions
                      projectId={project.id}
                      slug={project.slug}
                      projectName={project.name}
                    />
                  </div>

                  <div className="mt-4 rounded-xl bg-zinc-50 p-4">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    <div>
                      <p className="text-xs text-zinc-500">Price from</p>
                      <p className="font-bold text-zinc-900">
                        {project.minPrice
                          ? formatPrice(project.minPrice)
                          : "On request"}
                      </p>
                    </div>
                    {(project.handoverQuarter ?? project.handoverLabel) ? (
                      <div>
                        <p className="text-xs text-zinc-500">Handover</p>
                        <p className="font-semibold text-zinc-900">
                          {project.handoverQuarter ?? project.handoverLabel}
                        </p>
                      </div>
                    ) : null}
                    {(project.areaNames ?? project.area) ? (
                      <div>
                        <p className="text-xs text-zinc-500">Area</p>
                        <p className="font-semibold text-zinc-900">
                          {project.areaNames ?? project.area}
                        </p>
                      </div>
                    ) : null}
                    {project.progressName ? (
                      <div>
                        <p className="text-xs text-zinc-500">Progress</p>
                        <p className="font-semibold text-zinc-900">
                          {project.progressName}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200/80 pt-4">
                    {project.ratingCount > 0 ? (
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-500">Rating</p>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="font-semibold text-zinc-900">
                            {project.ratingAverage.toFixed(1)}
                          </span>
                          <span className="text-xs text-zinc-500">
                            ({project.ratingCount})
                          </span>
                        </div>
                      </div>
                    ) : null}
                    <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
                      <VerifiedListingBadge />
                      {project.marketedBy ? (
                        <MarketedByBadge label={project.marketedBy} size="sm" />
                      ) : null}
                    </div>
                  </div>
                  </div>

                  <ProjectGeoSummary
                    name={project.name}
                    area={project.areaNames ?? project.area}
                    builder={
                      project.builderNames.length
                        ? project.builderNames.join(", ")
                        : project.builderName
                    }
                    projectType={project.projectTypeName}
                    progress={project.progressName}
                    minPrice={project.minPrice}
                  />
                </div>
              </div>

              {project.details?.trim() ? (
                <SanitizedHtml
                  html={project.details}
                  className="prose prose-sm max-w-none rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-600"
                />
              ) : null}

              <TrackedSection section="highlights" projectId={project.id}>
                <ProjectHighlightsSection info={project.projectInfo} />
              </TrackedSection>

              <TrackedSection section="amenities" projectId={project.id}>
                <ProjectFeatures
                  amenities={project.amenities}
                  utilities={project.utilities}
                />
              </TrackedSection>

              {project.units.length > 0 && (
                <TrackedSection section="units_and_plans" projectId={project.id}>
                  <section>
                    <h2 className="mb-3 text-lg font-semibold">Units & plans</h2>
                    {session ? (
                      <ProjectUnitsSection
                        projectId={project.id}
                        projectSlug={project.slug}
                        units={project.units}
                        installmentMonths={project.installmentMonths}
                      />
                    ) : (
                      <AuthGatePrompt
                        title="Register or sign in to view units & plans"
                        description="See unit pricing, floor plans, room details, and payment breakdowns for this project."
                        returnPath={`/project/${project.slug}`}
                      />
                    )}
                  </section>
                </TrackedSection>
              )}

              <TrackedSection section="attachments" projectId={project.id}>
                <ProjectAttachmentsSection
                  projectId={project.id}
                  projectName={project.name}
                  documents={project.documents}
                />
              </TrackedSection>

              <TrackedSection section="location_map" projectId={project.id}>
                <ProjectLocationMap
                  name={project.name}
                  address={project.address}
                  area={project.area}
                  latitude={project.latitude}
                  longitude={project.longitude}
                  imageUrl={project.imageUrl}
                />
              </TrackedSection>

              <ProjectMediaSection
                projectVideoEmbed={project.projectVideoEmbed}
                projectVideoUrl={project.projectVideoUrl}
                videos={project.videos}
              />

              <TrackedSection section="reviews" projectId={project.id}>
                <ReviewsSection
                  projectId={project.id}
                  ratingAverage={project.ratingAverage}
                  ratingCount={project.ratingCount}
                />
              </TrackedSection>

              <RecentViewsSection excludeProjectId={project.id} />

              {project.similarProjects.length > 0 && (
                <section>
                  <h2 className="mb-3 text-lg font-semibold">Similar projects</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {project.similarProjects.map((p) => (
                      <ProjectCard key={p.id} project={p} />
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
              <TrackedSection section="inquiry_form" projectId={project.id}>
                <InquiryForm projectId={project.id} units={project.units} />
              </TrackedSection>
              <TrackedSection section="payment_schedule" projectId={project.id}>
                {session ? (
                  project.units.length > 0 ? (
                    <PaymentScheduleSection
                      projectId={project.id}
                      units={project.units}
                      installmentMonths={project.installmentMonths}
                    />
                  ) : null
                ) : (
                  <AuthGatePrompt
                    title="Sign in for payment schedule"
                    description="Register or sign in to request a payment schedule for this project."
                    returnPath={`/project/${project.slug}`}
                  />
                )}
              </TrackedSection>
              <VoucherButton projectId={project.id} projectName={project.name} />
            </aside>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
