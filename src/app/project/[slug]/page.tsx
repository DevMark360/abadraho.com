import "@/styles/font-awesome-local.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CalendarClock,
  MapPin,
  Star,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { cn, formatPrice } from "@/lib/utils";
import { designTw } from "@/config/design-tokens";
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

/** Status pill colours by construction stage. */
function progressTone(progress: string): string {
  const p = progress.toLowerCase();
  if (/complete|ready|handed|possession/.test(p)) return "bg-emerald-50 text-emerald-700";
  if (/launch|booking/.test(p)) return "bg-violet-50 text-violet-700";
  if (/construction|progress/.test(p)) return "bg-amber-50 text-amber-800";
  return "bg-clay-well text-zinc-700";
}

function KeyFact({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        designTw.clayWell,
        "flex items-start gap-3 p-3.5",
        highlight && "col-span-2 sm:col-span-1"
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" aria-hidden />
      <div className="min-w-0">
        <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
        <dd className={cn("mt-0.5 break-words font-bold leading-snug text-zinc-900", highlight ? "text-base" : "text-sm")}>
          {value}
        </dd>
      </div>
    </div>
  );
}

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

          {/* grid-cols-1 + min-w-0: without them one long unbreakable string in project content
              (e.g. an attachment filename) widens the column past the phone screen. */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="min-w-0 space-y-6 lg:col-span-2">
              <div className={cn(designTw.publicCard, "overflow-hidden")}>
                <div className="p-3 pb-0 sm:p-4 sm:pb-0">
                  <TrackedSection section="gallery" projectId={project.id}>
                    <ProjectGallery images={galleryImages} projectName={project.name} />
                  </TrackedSection>
                </div>
                <div className="p-5 sm:p-7">
                  <div className="flex flex-wrap items-center gap-2">
                    {project.progressName ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-clay-sm",
                          progressTone(project.progressName)
                        )}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                        {project.progressName}
                      </span>
                    ) : null}
                    {project.projectTypeName ? (
                      <span className="rounded-full bg-clay-well px-3 py-1 text-xs font-semibold text-zinc-700 shadow-clay-inset">
                        {project.projectTypeName}
                      </span>
                    ) : null}
                    <VerifiedListingBadge />
                  </div>

                  <h1 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-3xl">
                    {project.name}
                  </h1>
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
                    {(project.areaNames ?? project.area) ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-brand-accent" aria-hidden />
                        {project.areaNames ?? project.area}
                      </span>
                    ) : null}
                    {project.builderNames.length || project.builderName ? (
                      <span>
                        by{" "}
                        <span className="font-medium text-zinc-700">
                          {project.builderNames.length
                            ? project.builderNames.join(", ")
                            : project.builderName}
                        </span>
                      </span>
                    ) : null}
                    {project.ratingCount > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
                        <span className="font-semibold text-zinc-800">
                          {project.ratingAverage.toFixed(1)}
                        </span>
                        ({project.ratingCount})
                      </span>
                    ) : null}
                  </p>
                  {project.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {project.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-clay-well px-2.5 py-0.5 text-xs font-medium text-zinc-600 shadow-clay-inset"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-5">
                    <ProjectDetailActions
                      projectId={project.id}
                      slug={project.slug}
                      projectName={project.name}
                    />
                  </div>

                  <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <KeyFact
                      icon={Banknote}
                      label="Price from"
                      value={project.minPrice ? formatPrice(project.minPrice) : "On request"}
                      highlight
                    />
                    {(project.handoverQuarter ?? project.handoverLabel) ? (
                      <KeyFact
                        icon={CalendarClock}
                        label="Handover"
                        value={(project.handoverQuarter ?? project.handoverLabel) as string}
                      />
                    ) : null}
                    {(project.areaNames ?? project.area) ? (
                      <KeyFact
                        icon={MapPin}
                        label="Area"
                        value={(project.areaNames ?? project.area) as string}
                      />
                    ) : null}
                    {project.projectTypeName ? (
                      <KeyFact icon={Building2} label="Type" value={project.projectTypeName} />
                    ) : null}
                  </dl>

                  {project.marketedBy ? (
                    <div className="mt-4 flex justify-end">
                      <MarketedByBadge label={project.marketedBy} size="sm" />
                    </div>
                  ) : null}

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

              {/* Long words in text may wrap anywhere (filenames, URLs), but tables keep normal
                  wrapping and a minimum column width, then scroll sideways inside the card on
                  phones. With "anywhere" inherited, table columns shrank to one-letter width. */}
              {project.details?.trim() ? (
                <SanitizedHtml
                  html={project.details}
                  className={cn(
                    designTw.publicCard,
                    "prose prose-sm max-w-none overflow-hidden p-6 text-zinc-600 [overflow-wrap:anywhere] sm:p-7",
                    "prose-headings:leading-snug prose-h2:text-xl prose-h3:text-lg sm:prose-h2:text-2xl",
                    "prose-img:rounded-xl prose-table:my-4 prose-table:block prose-table:max-w-full prose-table:overflow-x-auto",
                    "[&_table]:[overflow-wrap:normal] [&_td]:min-w-[6.5rem] [&_td]:align-top [&_th]:min-w-[6.5rem] [&_th]:align-bottom",
                    "[&_iframe]:aspect-video [&_iframe]:h-auto [&_iframe]:w-full")}
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

            <aside className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
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
