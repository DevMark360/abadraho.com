import Image from "next/image";
import { SectionHeadline } from "@/components/marketing/section-headline";
import { PartnersRow } from "@/components/marketing/partners-row";
import { GeoPageSummary } from "@/components/marketing/geo-page-summary";
import {
  PublicPage,
  PublicPageBody,
  PublicPageHeader,
} from "@/components/layout/public-page-layout";
import { designTw } from "@/config/design-tokens";
import { cn } from "@/lib/utils";
import { aboutContent, partnerLogos } from "@/config/marketing";
import { geoContent } from "@/config/geo-content";
import { Handshake, Eye, ArrowRight } from "lucide-react";
import {
  MarkPropertiesBadge,
  TrustStatsRow,
} from "@/components/marketing/trust-signals";
import { JsonLd } from "@/components/seo/json-ld";
import { FaqSchema } from "@/components/seo/faq-schema";
import { buildWebPageSchema } from "@/lib/schema-markup";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "About us",
  description:
    "Learn about AbadRaho, Pakistan's platform for discovering and investing in off-plan real estate with end-to-end buyer support.",
  path: "/about-us",
});

export default function AboutUsPage() {
  return (
    <PublicPage>
      <JsonLd
        data={buildWebPageSchema({
          name: "About AbadRaho",
          description:
            "Learn about AbadRaho and Mark Properties — Pakistan's trusted team for off-plan real estate investment and buyer support.",
          path: "/about-us",
          type: "AboutPage",
        })}
      />
      <FaqSchema items={geoContent.about.intents} />
      <PublicPageHeader
        title="About AbadRaho & Mark Properties"
        subtitle="Pakistan's off-plan property platform, run by the Mark Properties advisory team in Karachi."
        crumbs={[
          { label: "Home", href: "/" },
          { label: "About us" },
        ]}
        aside={
          <div className="space-y-4">
            <MarkPropertiesBadge size="md" />
            <TrustStatsRow compact />
          </div>
        }
      />

      <PublicPageBody>
        <SectionHeadline
          align="left"
          before="Leadership message from"
          highlight="Mark Properties"
          subtitle="Experience-led guidance for off-plan buyers across Pakistan."
          className="mb-10"
        />
        <div className={cn(designTw.publicCard, "grid gap-8 p-5 sm:p-8 lg:grid-cols-5 lg:gap-10 lg:p-10")}>
          <div className="lg:col-span-3">
            <blockquote className="mb-6 border-l-4 border-brand-accent pl-4 text-lg font-medium italic leading-relaxed text-zinc-800 md:text-xl">
              &ldquo;{aboutContent.pullQuote}&rdquo;
            </blockquote>
            <div className="max-w-3xl space-y-4 text-base leading-relaxed text-zinc-700 md:text-lg">
              <h2 className="sr-only">CEO message</h2>
              {aboutContent.ceoParagraphs.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
            </div>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-clay-lg shadow-clay-sm lg:col-span-2">
            <Image
              src={aboutContent.bannerImage}
              alt="Mark Properties — AbadRaho real estate advisory team"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        </div>

        <GeoPageSummary
          variant="accordion"
          className="mt-10 max-w-3xl"
          intents={geoContent.about.intents}
          faqToggleLabel="About AbadRaho"
        />
      </PublicPageBody>

      <section>
        <PublicPageBody className="pt-2 sm:pt-4">
          <SectionHeadline
            align="left"
            before="Why buyers"
            highlight="trust AbadRaho"
            subtitle="Our mission, vision, and values reflect how Mark Properties serves off-plan investors."
            className="mb-10"
          />
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scroll-px-4 md:mx-0 md:grid md:grid-cols-3 md:gap-8 md:overflow-visible md:px-0 md:pb-0">
            {[
              { title: "Our mission", text: aboutContent.mission, icon: Handshake },
              { title: "Our vision", text: aboutContent.vision, icon: Eye },
              { title: "Our core values", text: aboutContent.values, icon: ArrowRight },
            ].map(({ title, text, icon: Icon }) => (
              <div
                key={title}
                className={cn(
                  designTw.publicCard,
                  "w-[min(85vw,320px)] shrink-0 snap-start p-6 sm:p-7 md:w-auto"
                )}
              >
                <Icon className="h-6 w-6 text-brand-accent" aria-hidden />
                <h3 className="mt-4 text-lg font-semibold text-zinc-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700 md:text-base">{text}</p>
              </div>
            ))}
          </div>
        </PublicPageBody>
      </section>

      <PartnersRow logos={partnerLogos} />
    </PublicPage>
  );
}
