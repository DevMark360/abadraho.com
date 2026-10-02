import Link from "next/link";
import type { Route } from "next";
import Image from "next/image";
import { SmartFeaturedSectionClient } from "@/components/marketing/smart-featured-section-client";
import {
  Search,
  Calendar,
  Phone,
  TrendingUp,
  Building2,
  Home,
  LandPlot,
  Store,
  GitCompare,
  CheckCircle2,
  ArrowRight,
  Users,
  ShieldCheck,
  Headphones,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { designTw } from "@/config/design-tokens";
import { BlogPostCard } from "@/components/marketing/blog-post-card";
import { PartnersRow } from "@/components/marketing/partners-row";
import { HomeProjectsMap } from "@/components/marketing/home-projects-map";
import { HomePlatformTimeline } from "@/components/marketing/home-platform-timeline";
import { HomeEventsScroller } from "@/components/marketing/home-events-scroller";
import { homeCardClass, HomeEmptyState } from "@/components/marketing/home-ui";
import {
  assistanceSteps,
  homeQuickPills,
  homeHeroImage,
  builderPartnerBenefits,
  propertyCategories,
  popularPlaces,
  partnerLogos,
} from "@/config/marketing";
import { geoContent } from "@/config/geo-content";
import { GeoPageSummary } from "@/components/marketing/geo-page-summary";
import { MarkPropertiesBadge } from "@/components/marketing/trust-signals";
import { legacyStaticUrl } from "@/lib/legacy-url";
import { cn } from "@/lib/utils";
import type { BlogPostSummary } from "@/server/services/blog.service";
import type { PublicEventSummary } from "@/server/services/event.service";
import type { ProjectListItem } from "@/types/project";

const container = "mx-auto w-full max-w-7xl px-4 sm:px-6";
const section = "py-12 md:py-16 lg:py-20";

const stepIcons = { search: Search, schedule: Calendar, phone: Phone, invest: TrendingUp };
const builderBenefitIcons = {
  building: Building2,
  users: Users,
  shield: ShieldCheck,
  headset: Headphones,
};
const categoryIcons = {
  building: Building2,
  plot: LandPlot,
  house: Home,
  commercial: Store,
};

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 md:mb-10", className)}>
      {eyebrow ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-accent">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">{title}</h2>
      {subtitle ? (
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-zinc-600">{subtitle}</p>
      ) : null}
    </div>
  );
}

export function HomeHero() {
  return (
    <section className="relative overflow-hidden border-b border-zinc-200 bg-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(212 212 216 / 0.5) 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      />
      <div className={cn(container, "relative py-12 md:py-16 lg:py-20")}>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <MarkPropertiesBadge size="md" className="mb-5" />
            <h1 className="text-3xl font-semibold leading-[1.15] tracking-tight text-zinc-900 md:text-4xl lg:text-5xl">
              Pakistan&apos;s platform for{" "}
              <span className="text-brand-accent">off-plan property</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-600 md:text-lg">
              Search verified listings, compare installment plans, and get free Mark Properties
              advisor support — all in one place.
            </p>

            <div className={cn(homeCardClass, "mt-8 p-4 sm:p-5")}>
              <form action="/projects" method="get" className="flex flex-col gap-2.5 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                    aria-hidden
                  />
                  <Input
                    name="q"
                    type="search"
                    placeholder="Search project, area or developer…"
                    className="h-12 border-zinc-200 bg-zinc-50 pl-10 focus:bg-white"
                  />
                </div>
                <Button type="submit" variant="accent" size="lg" className="h-12 w-full sm:w-auto sm:px-8">
                  Search projects
                </Button>
              </form>
              <div className="mt-3 flex flex-wrap gap-2">
                {homeQuickPills.map((pill) => (
                  <Link
                    key={pill.label}
                    href={pill.href as Route}
                    className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-200"
                  >
                    {pill.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-100 shadow-lg ring-1 ring-zinc-900/5">
              <Image
                src={homeHeroImage}
                alt="Off-plan property in Karachi"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/projects"
                className={cn(homeCardClass, "flex items-center gap-3 p-4")}
              >
                <Building2 className="h-5 w-5 text-brand-accent" />
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Browse listings</p>
                  <p className="text-xs text-zinc-500">All projects</p>
                </div>
              </Link>
              <Link
                href="/compare"
                className={cn(homeCardClass, "flex items-center gap-3 p-4")}
              >
                <GitCompare className="h-5 w-5 text-brand-accent" />
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Compare</p>
                  <p className="text-xs text-zinc-500">Payment plans</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TrustSignalsSection() {
  return null;
}

export function HomeValuePropsSection() {
  return null;
}

export function HomeInsightsSection({
  mapProjects,
}: {
  mapProjects: ProjectListItem[];
}) {
  return (
    <section className={cn(section, "bg-zinc-50")}>
      <div className={container}>
        <SectionHeader
          eyebrow="Market insights"
          title="Map & buyer journey"
          subtitle="See project locations across Karachi and how AbadRaho guides your investment process."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          <HomeProjectsMap projects={mapProjects} />
          <HomePlatformTimeline />
        </div>
      </div>
    </section>
  );
}

export function AssistanceSection() {
  return (
    <section className={cn(section, "bg-white")}>
      <div className={container}>
        <SectionHeader
          eyebrow="How it works"
          title="Four steps to your next investment"
          subtitle="Mark Properties advisors support you at every stage."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {assistanceSteps.map((step, i) => {
            const Icon = stepIcons[step.icon];
            return (
              <div key={step.title} className={cn(homeCardClass, "p-5")}>
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <Icon className="h-5 w-5 text-brand-accent" aria-hidden />
                </div>
                <h3 className="mt-4 font-semibold text-zinc-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function FeaturedPropertiesSection({
  projects,
}: {
  projects: ProjectListItem[];
}) {
  return (
    <section className={cn(section, "bg-white")} id="featured">
      <div className={container}>
        {projects.length ? (
          <SmartFeaturedSectionClient defaultProjects={projects} />
        ) : (
          <HomeEmptyState
            title="No featured projects yet"
            illustration="home"
            description="Listings will appear here once projects are published. Browse all off-plan inventory in the meantime."
            icon={Building2}
            action={
              <Button asChild>
                <Link href="/projects">Browse all projects</Link>
              </Button>
            }
          />
        )}
      </div>
    </section>
  );
}

export function CategoriesSection() {
  return (
    <section className={cn(section, "bg-zinc-50")}>
      <div className={container}>
        <SectionHeader
          eyebrow="Quick filters"
          title="Browse by property type"
          subtitle="Jump straight to the inventory that matches your investment goal."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {propertyCategories.map((cat) => {
            const Icon = categoryIcons[cat.icon];
            return (
              <Link key={cat.title} href={cat.href as Route} className={cn(homeCardClass, "group p-5")}>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-white transition group-hover:bg-brand-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 flex items-center gap-1 font-semibold text-zinc-900">
                  {cat.title}
                  <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </h3>
                <p className="mt-1.5 text-sm text-zinc-600">{cat.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function PopularPlacesSection({
  areaCounts = {},
}: {
  areaCounts?: Record<string, number>;
}) {
  return (
    <section className={cn(section, "bg-white")}>
      <div className={container}>
        <SectionHeader
          eyebrow="Locations"
          title="Popular areas in Karachi"
          subtitle="High-demand zones for off-plan apartments, plots, and houses."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {popularPlaces.map((place) => {
            const count = areaCounts[place.name];
            return (
              <Link
                key={place.name}
                href={place.href as Route}
                className={cn(
                  "group block h-full overflow-hidden rounded-2xl ring-1 ring-zinc-200 transition hover:ring-zinc-300 hover:shadow-md",
                  place.large ? "md:col-span-8" : "md:col-span-4"
                )}
              >
                <div className="relative aspect-[16/10] h-full min-h-[200px] w-full overflow-hidden bg-zinc-200 md:aspect-auto md:min-h-[240px]">
                  <Image
                    src={place.image}
                    alt={place.name}
                    fill
                    sizes={
                      place.large
                        ? "(max-width: 768px) 100vw, 66vw"
                        : "(max-width: 768px) 100vw, 33vw"
                    }
                    className="object-cover transition duration-300 group-hover:scale-105"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
                  {count != null && count > 0 ? (
                    <span className="absolute right-3 top-3 z-10 rounded-full bg-brand-accent px-3 py-1 text-xs font-bold text-white shadow-sm">
                      {count} listings
                    </span>
                  ) : null}
                  <div className="absolute bottom-0 left-0 z-10 p-5">
                    <h3 className="text-xl font-semibold text-white drop-shadow-sm">
                      {place.name}
                    </h3>
                    {count != null && count > 0 ? (
                      <p className="mt-0.5 text-sm text-white/90">
                        {count} projects available
                      </p>
                    ) : (
                      <p className="mt-0.5 text-sm text-white/80">Explore projects</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function HomeEventsSection({ events }: { events: PublicEventSummary[] }) {
  if (!events.length) return null;

  return (
    <section className={cn(section, "bg-zinc-900")}>
      <div className={container}>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-10">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-accent">
              Happening soon
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Builder events &amp; launches
            </h2>
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-zinc-400">
              Project launches, open houses, and marketing events from our builder partners.
            </p>
          </div>
          <Link
            href="/events"
            className="shrink-0 text-sm font-semibold text-brand-accent hover:underline"
          >
            View all events →
          </Link>
        </div>
        <HomeEventsScroller events={events} />
      </div>
    </section>
  );
}

export function HomeTestimonialSection() {
  return null;
}

export function BuilderPartnerSection() {
  return (
    <section className={cn(section, "border-y border-zinc-200 bg-zinc-50")}>
      <div className={container}>
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className={cn(homeCardClass, "p-6 sm:p-8")}>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">
              For builders
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-900 md:text-3xl">
              List your project on AbadRaho
            </h2>
            <p className="mt-3 text-base leading-relaxed text-zinc-600">
              Reach qualified off-plan buyers, showcase payment plans, and grow with Mark Properties
              onboarding support.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="accent" size="lg" className="w-full sm:w-auto">
                <Link href="/contact">Partner with us</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link href="/login">Builder login</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {builderPartnerBenefits.map((b) => {
              const Icon = builderBenefitIcons[b.icon];
              return (
                <div key={b.title} className={cn(homeCardClass, "p-4")}>
                  <Icon className="h-5 w-5 text-brand-accent" aria-hidden />
                  <h3 className="mt-2 font-semibold text-zinc-900">{b.title}</h3>
                  <p className="mt-1 text-sm text-zinc-600">{b.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function WhatIsAbadRahoSection() {
  const features = [
    "Search by area, budget, and handover date",
    "Compare payment plans across projects",
    "Free Mark Properties advisor support",
    "Verified builder partner listings",
  ];

  return (
    <section className={cn(section, "bg-white")}>
      <div className={container}>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader title="What is AbadRaho?" className="mb-4" />
            <p className="text-base leading-relaxed text-zinc-700">
              {geoContent.home.intents?.[0]?.answer}
            </p>
            <ul className="mt-6 space-y-3">
              {features.map((f) => (
                <li key={f} className="flex gap-2.5 text-sm text-zinc-700 sm:text-base">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {f}
                </li>
              ))}
            </ul>
            <GeoPageSummary
              variant="accordion"
              compact
              className="mt-6"
              intents={geoContent.home.intents}
              faqToggleLabel="Common questions"
            />
          </div>
          <div className={cn(homeCardClass, "relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden")}>
            <Image
              src={legacyStaticUrl("/assets/images/home/mobile-view1.png")}
              alt="AbadRaho on mobile"
              fill
              className="object-contain p-4"
              unoptimized
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function LatestBlogSection({ posts }: { posts: BlogPostSummary[] }) {
  if (!posts.length) {
    return (
      <section className={cn(section, "bg-zinc-50")}>
        <div className={container}>
          <SectionHeader title="Buyer guides" subtitle="Expert articles for off-plan investors." />
          <HomeEmptyState
            title="No articles yet"
            description="Buyer guides and market insights will be published here soon."
            icon={BookOpen}
          />
        </div>
      </section>
    );
  }

  return (
    <section className={cn(section, "bg-zinc-50")}>
      <div className={container}>
        <SectionHeader
          eyebrow="Resources"
          title="Buyer guides"
          subtitle="Payment plans, area trends, and project evaluation tips."
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <BlogPostCard key={post.id} post={post} />
          ))}
        </div>
        <p className="mt-8 text-center">
          <Link href="/blog" className="text-sm font-semibold text-brand-accent hover:underline">
            View all articles →
          </Link>
        </p>
      </div>
    </section>
  );
}

export function HomePartnersSection() {
  return <PartnersRow logos={partnerLogos} />;
}

export function HomeAdvisorCtaSection() {
  return (
    <section className="bg-zinc-900">
      <div className={cn(container, "py-12 md:py-16")}>
        <div className={cn(homeCardClass, "flex flex-col gap-6 border-zinc-700 bg-zinc-800/50 p-6 md:flex-row md:items-center md:justify-between md:p-8")}>
          <div className="max-w-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-accent">
              Free consultation
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white md:text-2xl">
              Need help choosing a project?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Mark Properties advisors provide personalized recommendations, site visits, and payment
              plan guidance.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild variant="accent" size="lg" className="w-full sm:w-auto">
              <Link href="/contact">Talk to an advisor</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full border-zinc-600 bg-transparent text-white hover:bg-zinc-700 sm:w-auto"
            >
              <Link href="/projects">Browse projects</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
