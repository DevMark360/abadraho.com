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
  ChevronDown,
  ExternalLink,
  Info,
  Landmark,
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
import { homeSources, type HomeFaq, type homeGuide } from "@/config/home-aeo";
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

export function HomeHero({ lead }: { lead: string }) {
  return (
    <section className="relative overflow-hidden">
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
              {lead}
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
                    className="h-12 pl-10"
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
                    className="rounded-full border border-white/80 bg-clay-surface px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-clay-sm transition-shadow hover:shadow-clay"
                  >
                    {pill.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-clay-lg bg-clay-well shadow-clay">
              <Image
                src={homeHeroImage}
                alt="Off-plan property in Karachi"
                width={800}
                height={600}
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="absolute inset-0 h-full w-full object-cover"
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

export function HomeInsightsSection() {
  return (
    <section className={section}>
      <div className={container}>
        <SectionHeader
          eyebrow="Market insights"
          title="Where are off-plan projects in Karachi?"
          subtitle="Every listed project on one map, plus the steps AbadRaho takes you through from search to booking."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          {/* The map fetches its own pins after load; embedding them made the home HTML ~290KB. */}
          <HomeProjectsMap />
          <HomePlatformTimeline />
        </div>
      </div>
    </section>
  );
}

export function AssistanceSection() {
  return (
    <section className={section}>
      <div className={container}>
        <SectionHeader
          eyebrow="How it works"
          title="How do you buy off-plan property on AbadRaho?"
          subtitle="Four steps, with free Mark Properties advisor support at each one."
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
    <section className={section} id="featured">
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
    <section className={section}>
      <div className={container}>
        <SectionHeader
          eyebrow="Quick filters"
          title="What types of off-plan property can you buy?"
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

export function PopularPlacesSection() {
  return (
    <section className={section}>
      <div className={container}>
        <SectionHeader
          eyebrow="Locations"
          title="Which Karachi areas are popular for off-plan property?"
          subtitle="High-demand zones for off-plan apartments, plots, and houses."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          {popularPlaces.map((place) => {
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
                    width={place.imageWidth}
                    height={place.imageHeight}
                    sizes={
                      place.large
                        ? "(max-width: 768px) 100vw, 66vw"
                        : "(max-width: 768px) 100vw, 33vw"
                    }
                    className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
                  <div className="absolute bottom-0 left-0 z-10 p-5">
                    <h3 className="text-xl font-semibold text-white drop-shadow-sm">
                      {place.name}
                    </h3>
                    {/* No project counts: they change over time (see home-aeo.ts). */}
                    <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-white/90">
                      Explore projects
                      <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden />
                    </p>
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
    <section className={section}>
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

export function WhatIsAbadRahoSection({ answer }: { answer: string }) {
  const features = [
    "Search by area, budget, and handover date",
    "Compare payment plans across projects",
    "Free Mark Properties advisor support",
    "Verified builder partner listings",
  ];

  return (
    <section className={section}>
      <div className={container}>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader title="What is AbadRaho?" className="mb-4" />
            <p className="text-base leading-relaxed text-zinc-700">
              {answer}
            </p>
            <ul className="mt-6 space-y-3">
              {features.map((f) => (
                <li key={f} className="flex gap-2.5 text-sm text-zinc-700 sm:text-base">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className={cn(homeCardClass, "relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden lg:mr-0")}>
            <Image
              src={legacyStaticUrl("/assets/images/home/mobile-view1.png")}
              alt="AbadRaho on mobile"
              width={460}
              height={480}
              className="absolute inset-0 h-full w-full object-contain p-4"
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
      <section className={section}>
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
    <section className={section}>
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

/** Buyer's guide — long-form answers, a comparison table, and a checklist (server-rendered for AEO). */
export function HomeBuyerGuideSection({ guide }: { guide: ReturnType<typeof homeGuide> }) {
  const { comparison } = guide;
  return (
    <section className={section} aria-labelledby="home-guide-title">
      <div className={container}>
        <SectionHeader eyebrow="Buyer's guide" title={guide.title} className="mb-4 md:mb-5" />
        <p className="max-w-3xl text-base leading-relaxed text-zinc-600">{guide.intro}</p>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <article className={cn(homeCardClass, "min-w-0 p-6 sm:p-7")}>
            <h3 className="text-lg font-semibold text-zinc-900">{guide.paymentPlans.question}</h3>
            {guide.paymentPlans.paragraphs.map((p) => (
              <p key={p.slice(0, 24)} className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
                {p}
              </p>
            ))}
            <h3 className="mt-6 text-lg font-semibold text-zinc-900">{guide.afterBooking.question}</h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 sm:text-base">
              {guide.afterBooking.paragraph}
            </p>
          </article>

          <article className={cn(homeCardClass, "min-w-0 p-6 sm:p-7")}>
            <h3 className="text-lg font-semibold text-zinc-900">{guide.checklist.question}</h3>
            <ul className="mt-4 space-y-3">
              {guide.checklist.items.map((item) => {
                const [label, ...rest] = item.split(": ");
                return (
                  <li key={label} className="flex gap-2.5 text-sm leading-relaxed text-zinc-600 sm:text-base">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                    <span>
                      <strong className="font-semibold text-zinc-900">{label}:</strong> {rest.join(": ")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </article>
        </div>

        <div className={cn(designTw.publicCard, "mt-6 min-w-0 p-6 sm:p-8")}>
          <h3 className="text-lg font-semibold text-zinc-900 sm:text-xl">{comparison.question}</h3>
          <p className="mt-1 text-sm text-zinc-500">The main differences at a glance.</p>

          {/* Tablet/desktop: a real <table> with the off-plan column highlighted. */}
          <table className="mt-6 hidden w-full table-fixed border-separate border-spacing-0 text-left text-sm md:table">
            <caption className="sr-only">{comparison.caption}</caption>
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[39%]" />
              <col className="w-[39%]" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">Aspect</span>
                </th>
                <th scope="col" className="rounded-t-2xl bg-brand-accent/[0.06] px-5 pb-4 pt-5 align-bottom">
                  <span className="flex items-center gap-2 text-base font-semibold text-zinc-900">
                    <span className="h-2 w-2 rounded-full bg-brand-accent" aria-hidden />
                    {comparison.columns[1]}
                  </span>
                  <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                    {comparison.columnNotes[1]}
                  </span>
                </th>
                <th scope="col" className="px-5 pb-4 pt-5 align-bottom">
                  <span className="flex items-center gap-2 text-base font-semibold text-zinc-900">
                    <span className="h-2 w-2 rounded-full bg-zinc-400" aria-hidden />
                    {comparison.columns[2]}
                  </span>
                  <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                    {comparison.columnNotes[2]}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map(([aspect, offPlan, ready], i) => {
                const last = i === comparison.rows.length - 1;
                return (
                  <tr key={aspect}>
                    <th
                      scope="row"
                      className="border-t border-clay-line py-4 pr-4 align-top text-xs font-semibold uppercase tracking-wide text-zinc-500"
                    >
                      {aspect}
                    </th>
                    <td
                      className={cn(
                        "border-t border-clay-line bg-brand-accent/[0.06] px-5 py-4 align-top leading-relaxed text-zinc-800",
                        last && "rounded-b-2xl"
                      )}
                    >
                      {offPlan}
                    </td>
                    <td className="border-t border-clay-line px-5 py-4 align-top leading-relaxed text-zinc-600">
                      {ready}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Phones: one card per aspect instead of a sideways-scrolling table. */}
          <dl className="mt-5 space-y-3 md:hidden">
            {comparison.rows.map(([aspect, offPlan, ready]) => (
              <div key={aspect} className={cn(designTw.clayWell, "p-4")}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{aspect}</dt>
                <dd className="mt-2 space-y-1.5 text-sm leading-relaxed">
                  <p>
                    <span className="font-semibold text-brand-accent">Off-plan: </span>
                    <span className="text-zinc-800">{offPlan}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-zinc-500">Ready: </span>
                    <span className="text-zinc-600">{ready}</span>
                  </p>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-10">
          <h3 className="text-lg font-semibold text-zinc-900">Official sources</h3>
          <p className="mt-1 text-sm text-zinc-500">
            Check a project&apos;s approvals with the development authority for its city.
          </p>
          <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {homeSources.map((src) => (
              <li key={src.url} className="min-w-0">
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(homeCardClass, "group flex h-full flex-col p-5")}
                >
                  <Landmark className="h-5 w-5 text-brand-accent" aria-hidden />
                  <span className="mt-3 font-semibold text-zinc-900">{src.name}</span>
                  <span className="mt-1 flex-1 text-sm leading-relaxed text-zinc-600">{src.note}</span>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-700 group-hover:text-brand-accent">
                    {new URL(src.url).hostname.replace(/^www\./, "")}
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-zinc-500">
            <Info className="mt-px h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
            General guidance only, not financial or legal advice. Confirm details with the developer
            and a qualified professional before you pay.
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Visible FAQ — the same questions and answers as the page's FAQPage JSON-LD. Answers live in
 * the DOM even when collapsed (native <details>), so crawlers and AI engines can read them.
 */
export function HomeFaqSection({ faqs }: { faqs: HomeFaq[] }) {
  if (!faqs.length) return null;
  return (
    <section className={section} aria-labelledby="home-faq-title">
      <div className={cn(container, "max-w-4xl")}>
        <div className="mb-8 text-center md:mb-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-accent">FAQ</p>
          <h2 id="home-faq-title" className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">
            Frequently asked questions
          </h2>
        </div>
        <div className="space-y-3">
          {faqs.map(({ question, answer }, i) => (
            <details key={question} className={cn(homeCardClass, "group")} open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:px-6 [&::-webkit-details-marker]:hidden">
                <h3 className="text-base font-semibold text-zinc-900">{question}</h3>
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-zinc-400 transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-zinc-600 sm:px-6 sm:text-base">{answer}</p>
            </details>
          ))}
        </div>
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
