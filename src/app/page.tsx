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
  HomePartnersSection,
  HomeAdvisorCtaSection,
} from "@/components/marketing/home-sections";
import { SiteTrustFooter } from "@/components/marketing/trust-signals";
import { getHomePageData } from "@/server/services/home-page.service";
import { listPublicEvents } from "@/server/services/event.service";
import { getSession } from "@/lib/session";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebPageSchema } from "@/lib/schema-markup";
import { buildPageMetadata } from "@/lib/seo";
import { getSlotRotation } from "@/server/services/ad-serving.service";
import {
  RotatingFeaturedSection,
  RotatingBannerSection,
  RotatingContentSection,
} from "@/components/advertising/ad-rotation";

export const metadata = buildPageMetadata({
  title: "Home",
  description:
    "AbadRaho helps you search, compare, and invest in off-plan properties across Pakistan with expert guidance and flexible payment plans.",
  path: "/",
});

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  const [{ featured, areaCounts, mapProjects }, featuredRotation, bannerRotation, contentRotation, upcomingEvents] =
    await Promise.all([
      getHomePageData(session?.id),
      getSlotRotation("featured_listing", null, null),
      getSlotRotation("banner", null, null),
      getSlotRotation("sponsored_content", null, null),
      listPublicEvents(12),
    ]);

  return (
    <MarketingShell>
      <JsonLd
        data={buildWebPageSchema({
          name: "AbadRaho Home",
          description:
            "AbadRaho helps you search, compare, and invest in off-plan properties across Pakistan with expert guidance and flexible payment plans.",
          path: "/",
        })}
      />
      <HomeHero />
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
      <WhatIsAbadRahoSection />
      <HomePartnersSection />
      <HomeAdvisorCtaSection />
      <SiteTrustFooter />
    </MarketingShell>
  );
}
