import {
  PublicPage,
  PublicPageBody,
  PublicPageHeader,
} from "@/components/layout/public-page-layout";
import { BlogListClient } from "@/components/marketing/blog-list-client";
import { CheckCircle2 } from "lucide-react";
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
        subtitle={geoContent.blog.summary}
        eyebrow="AbadRaho blog"
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Blog" },
        ]}
        aside={
          <div>
            <p className="text-sm font-semibold text-zinc-900">What you&apos;ll find here</p>
            <ul className="mt-3 space-y-2.5 text-sm text-zinc-600">
              {geoContent.blog.bullets.map((point) => (
                <li key={point} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        }
      />

      <PublicPageBody className="pt-2 sm:pt-2">
        <BlogListClient posts={posts} />
      </PublicPageBody>
    </PublicPage>
  );
}
