import Link from "next/link";
import type { Route } from "next";
import Image from "next/image";
import { legacyBlogImageUrl } from "@/lib/legacy-url";
import type { BlogPostSummary } from "@/server/services/blog.service";

export function BlogFeaturedPostCard({ post }: { post: BlogPostSummary }) {
  const href = (
    post.categorySlug
      ? `/blog/${post.categorySlug}/${post.slug}`
      : `/blog/post/${post.slug}`
  ) as Route;
  const imageUrl = post.imageUrl ?? legacyBlogImageUrl(post.coverImg ?? null);
  const date = post.createdAt
    ? new Date(post.createdAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <article className="overflow-hidden rounded-clay-lg border border-white/80 bg-clay-surface shadow-clay transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-clay-hover">
      <Link href={href} className="block">
        <div className="relative aspect-[16/7] bg-zinc-100 sm:aspect-[16/6]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={post.title}
              fill
              className="object-cover"
              unoptimized
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">
              No image
            </div>
          )}
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-semibold text-brand-foreground">
              Latest
            </span>
            {post.categoryName && (
              <span className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
                {post.categoryName}
              </span>
            )}
          </div>
          <h2 className="mt-2 line-clamp-2 text-xl font-semibold text-zinc-900 sm:text-2xl lg:text-3xl">
            {post.title}
          </h2>
          <ul className="mt-2 flex flex-wrap gap-x-3 text-xs text-zinc-500">
            <li>By, Mark Admin</li>
            {date && <li>{date}</li>}
          </ul>
          {post.excerpt && (
            <p className="mt-3 line-clamp-2 max-w-3xl text-sm text-zinc-600 sm:text-base">
              {post.excerpt}
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}
