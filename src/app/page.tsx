import { MarketingShell } from "@/components/layout/marketing-shell";
import {
  HomeHero,
  HomeInsightsSection,
  AssistanceSection,
  FeaturedPropertiesSection,
  CategoriesSection,
  PopularPlacesSection,
  HomeEventsSection,
  BuilderPartnerSection,
  WhatIsAbadRahoSection,
  HomeFaqSection,
  HomeBuyerGuideSection,
  HomeMarketDataSection,
  HomePartnersSection,
  HomeAdvisorCtaSection,
} from "@/components/marketing/home-sections";
import { SiteTrustFooter } from "@/components/marketing/trust-signals";
import { getHomePageData } from "@/server/services/home-page.service";
import { listPublicEvents } from "@/server/services/event.service";
import { getSession } from "@/lib/session";
import { JsonLd } from "@/components/seo/json-ld";
import { buildFaqSchema, buildHowToSchema, buildWebPageSchema } from "@/lib/schema-markup";
import { homeFaqs, homeGuide, homeHowTo, homeInsights, homeLead } from "@/config/home-aeo";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { getSlotRotation } from "@/server/services/ad-serving.service";
import {
  RotatingFeaturedSection,
  RotatingBannerSection,
  RotatingContentSection,
} from "@/components/advertising/ad-rotation";

export const metadata = buildPageMetadata({
  absoluteTitle: "AbadRaho: Off-plan Property in Karachi & Pakistan",
  description:
    "AbadRaho helps you search, compare, and invest in off-plan properties across Pakistan with expert guidance and flexible payment plans.",
  path: "/",
});

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  const [{ featured, areaCounts, mapProjects, projectCount }, featuredRotation, bannerRotation, contentRotation, upcomingEvents] =
    await Promise.all([
      getHomePageData(session?.id),
      getSlotRotation("featured_listing", null, null),
      getSlotRotation("banner", null, null),
      getSlotRotation("sponsored_content", null, null),
      listPublicEvents(12),
    ]);

  const facts = { projectCount, areaCounts };
  const faqs = homeFaqs(facts);
  const [whatIs, ...moreFaqs] = faqs;

  return (
    <MarketingShell>
      <JsonLd
        data={[
          buildWebPageSchema({
            name: "AbadRaho Home",
            description:
              "AbadRaho helps you search, compare, and invest in off-plan properties across Pakistan with expert guidance and flexible payment plans.",
            path: "/",
          }),
          // Built from the same data as the visible FAQ / "What is AbadRaho?" / How it works.
          { ...buildFaqSchema(faqs), "@id": `${absoluteUrl("/")}#faq` },
          buildHowToSchema({ ...homeHowTo, path: "/" }),
        ]}
      />
      <HomeHero lead={homeLead(facts)} />
      <FeaturedPropertiesSection projects={featured} />
      <RotatingFeaturedSection rotation={featuredRotation} />
      <HomeInsightsSection mapProjects={mapProjects} />
      <RotatingContentSection rotation={contentRotation} />
      <AssistanceSection />
      <CategoriesSection />
      <RotatingBannerSection rotation={bannerRotation} />
      <PopularPlacesSection areaCounts={areaCounts} />
      <HomeEventsSection events={upcomingEvents} />
      <BuilderPartnerSection />
      <WhatIsAbadRahoSection answer={whatIs.answer} />
      <HomeMarketDataSection insights={homeInsights(mapProjects, projectCount)} projectCount={projectCount} />
      <HomeBuyerGuideSection guide={homeGuide(facts)} />
      <HomeFaqSection faqs={moreFaqs} />
      <HomePartnersSection />
      <HomeAdvisorCtaSection />
      <SiteTrustFooter />
    </MarketingShell>
  );
}
