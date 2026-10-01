import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  PublicPage,
  PublicPageBody,
} from "@/components/layout/public-page-layout";
import { BlogArticleByline } from "@/components/marketing/blog-article-byline";
import { BlogArticleCta } from "@/components/marketing/blog-article-cta";
import { SanitizedHtml } from "@/components/ui/sanitized-html";
import { getBlogPost } from "@/server/services/blog.service";
import { JsonLd } from "@/components/seo/json-ld";
import { buildArticleSchema } from "@/lib/schema-markup";
import { estimateReadingTime } from "@/lib/reading-time";
import { buildPageMetadata } from "@/lib/seo";

interface PageProps {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { category, slug } = await params;
  const post = await getBlogPost(category, slug);
  if (!post) {
    return buildPageMetadata({
      title: "Article not found",
      path: `/blog/${category}/${slug}`,
      noIndex: true,
    });
  }

  const plainText = post.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  return buildPageMetadata({
    title: post.title,
    description: plainText.slice(0, 160),
    path: `/blog/${category}/${slug}`,
    image: post.imageUrl,
    imageAlt: post.title,
    type: "article",
  });
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { category, slug } = await params;
  const post = await getBlogPost(category, slug);
  if (!post) notFound();

  const date = post.updatedAt
    ? new Date(post.updatedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  const plainText = post.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const readingMinutes = estimateReadingTime(plainText);

  return (
    <PublicPage>
      <JsonLd
        data={buildArticleSchema({
          title: post.title,
          description: plainText.slice(0, 160),
          path: `/blog/${category}/${slug}`,
          image: post.imageUrl,
          dateModified: post.updatedAt,
          category: post.categoryName,
        })}
      />

      <nav className="border-b border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500">
        <div className="mx-auto max-w-4xl">
          <Link href="/" className="hover:text-zinc-900">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/blog" className="hover:text-zinc-900">Blogs</Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-zinc-900">{post.title}</span>
        </div>
      </nav>

      {post.imageUrl ? (
        <div className="relative aspect-[21/9] w-full bg-zinc-900 md:aspect-[3/1]">
          <Image
            src={post.imageUrl}
            alt={post.title}
            fill
            className="object-cover opacity-80"
            unoptimized
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-8 pt-16">
            <div className="mx-auto max-w-4xl">
              {post.categoryName ? (
                <span className="rounded-full bg-brand-accent/90 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  {post.categoryName}
                </span>
              ) : null}
              <h1 className="mt-3 text-2xl font-semibold text-white md:text-4xl">
                {post.title}
              </h1>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-b border-zinc-200 bg-white px-4 py-8">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-2xl font-semibold text-zinc-900 md:text-3xl">
              {post.title}
            </h1>
          </div>
        </div>
      )}

      <PublicPageBody className="max-w-4xl">
        <BlogArticleByline
          date={date || undefined}
          category={post.categoryName}
          readingMinutes={readingMinutes}
          className="mt-6"
        />
        <SanitizedHtml
          as="article"
          html={post.content}
          className="prose prose-lg prose-zinc mt-8 max-w-3xl prose-headings:tracking-tight prose-a:text-brand prose-img:rounded-lg"
        />
        <BlogArticleCta areaHint={post.categoryName} />
      </PublicPageBody>
    </PublicPage>
  );
}
