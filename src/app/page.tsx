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
  LatestBlogSection,
  HomePartnersSection,
  HomeAdvisorCtaSection,
} from "@/components/marketing/home-sections";
import { SiteTrustFooter } from "@/components/marketing/trust-signals";
import { getHomePageData } from "@/server/services/home-page.service";
import { getHomeListingStats } from "@/server/services/home-stats.service";
import { listPublicEvents } from "@/server/services/event.service";
import { getSession } from "@/lib/session";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildBlogSchema,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildHowToSchema,
  buildWebPageSchema,
} from "@/lib/schema-markup";
import { listBlogPosts } from "@/server/services/blog.service";
import {
  HOME_CONTENT_PUBLISHED,
  HOME_CONTENT_UPDATED,
  homeFaqs,
  homeGuide,
  homeListingInsights,
  homeHowTo,
  homeLead,
} from "@/config/home-aeo";
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
    "AbadRaho is a platform for buying off-plan property in Pakistan by Mark Properties. Compare Karachi projects, payment plans, and handover dates for free.",
  path: "/",
});

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();
  const [
    { featured },
    featuredRotation,
    bannerRotation,
    contentRotation,
    upcomingEvents,
    latestPosts,
    listingStats,
  ] =
    await Promise.all([
      getHomePageData(session?.id),
      getSlotRotation("featured_listing", null, null),
      getSlotRotation("banner", null, null),
      getSlotRotation("sponsored_content", null, null),
      listPublicEvents(12),
      listBlogPosts(3),
      getHomeListingStats(),
    ]);
  // Same posts as the visible "Buyer guides" cards (posts need a category for their URL).
  const blogPosts = latestPosts.filter((post) => post.categorySlug);
  // Last change to what the page shows: the home copy, or a newer blog post in "Buyer guides".
  const newestPost = blogPosts.reduce<Date | null>(
    (max, p) => (!max || p.createdAt > max ? p.createdAt : max),
    null
  );
  const homeModified =
    newestPost && newestPost > new Date(HOME_CONTENT_UPDATED)
      ? newestPost
      : new Date(HOME_CONTENT_UPDATED);

  const faqs = homeFaqs();
  const [whatIs, ...moreFaqs] = faqs;

  return (
    <MarketingShell>
      <JsonLd
        data={[
          buildWebPageSchema({
            name: "AbadRaho Home",
            description:
              "AbadRaho is a platform for buying off-plan property in Pakistan by Mark Properties. Compare Karachi projects, payment plans, and handover dates for free.",
            path: "/",
            datePublished: HOME_CONTENT_PUBLISHED,
            dateModified: homeModified,
          }),
          // Built from the same data as the visible FAQ / "What is AbadRaho?" / How it works.
          { ...buildFaqSchema(faqs), "@id": `${absoluteUrl("/")}#faq` },
          buildHowToSchema({ ...homeHowTo, path: "/" }),
          // Root of the site hierarchy (other pages show Home › … trails).
          buildBreadcrumbSchema([{ name: "Home", path: "/" }]),
          ...(blogPosts.length
            ? [
                buildBlogSchema(
                  blogPosts.map((post) => ({
                    title: post.title,
                    path: `/blog/${post.categorySlug}/${post.slug}`,
                    image: post.imageUrl,
                    datePublished: post.createdAt,
                    description: post.excerpt,
                  }))
                ),
              ]
            : []),
        ]}
      />
      <HomeHero lead={homeLead()} />
      <FeaturedPropertiesSection projects={featured} />
      <RotatingFeaturedSection rotation={featuredRotation} />
      <HomeInsightsSection />
      <RotatingContentSection rotation={contentRotation} />
      <AssistanceSection />
      <CategoriesSection />
      <RotatingBannerSection rotation={bannerRotation} />
      <PopularPlacesSection />
      <HomeEventsSection events={upcomingEvents} />
      <BuilderPartnerSection />
      <WhatIsAbadRahoSection answer={whatIs.answer} />
      <HomeBuyerGuideSection guide={homeGuide()} insights={homeListingInsights(listingStats)} />
      {blogPosts.length ? <LatestBlogSection posts={blogPosts} /> : null}
      <HomeFaqSection faqs={moreFaqs} />
      <HomePartnersSection />
      <HomeAdvisorCtaSection />
      <SiteTrustFooter />
    </MarketingShell>
  );
}
