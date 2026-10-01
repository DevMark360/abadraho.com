import {
  PublicPage,
  PublicPageBody,
  PublicPageHeader,
} from "@/components/layout/public-page-layout";
import { BlogListClient } from "@/components/marketing/blog-list-client";
import { GeoPageSummary } from "@/components/marketing/geo-page-summary";
import { listBlogPosts } from "@/server/services/blog.service";
import { JsonLd } from "@/components/seo/json-ld";
import { buildBlogListSchema } from "@/lib/schema-markup";
import { geoContent } from "@/config/geo-content";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Blog",
  description:
    "Read the latest guides, market updates, and investment tips for off-plan property buyers in Pakistan.",
  path: "/blog",
});

export default async function BlogPage() {
  const posts = await listBlogPosts();

  const schemaPosts = posts
    .filter((post) => post.categorySlug)
    .map((post) => ({
      title: post.title,
      path: `/blog/${post.categorySlug}/${post.slug}`,
      image: post.imageUrl,
    }));

  return (
    <PublicPage>
      <JsonLd data={buildBlogListSchema(schemaPosts)} />
      <PublicPageHeader
        title="Off-plan property guides & market updates"
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Blog" },
        ]}
      />

      <PublicPageBody>
        <GeoPageSummary
          variant="chips"
          bullets={geoContent.blog.bullets}
          factsToggleLabel="Topics we cover"
          className="mb-2"
        />
        <BlogListClient posts={posts} />
      </PublicPageBody>
    </PublicPage>
  );
}
