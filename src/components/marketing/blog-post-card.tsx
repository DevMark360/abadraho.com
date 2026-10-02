import Link from "next/link";
import type { Route } from "next";
import Image from "next/image";
import { legacyBlogImageUrl } from "@/lib/legacy-url";
import type { BlogPostSummary } from "@/server/services/blog.service";

export function BlogPostCard({ post }: { post: BlogPostSummary }) {
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
        <div className="relative aspect-[16/10] bg-zinc-100">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={post.title}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">
              No image
            </div>
          )}
        </div>
        <div className="p-4">
          {post.categoryName && (
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-accent">
              {post.categoryName}
            </p>
          )}
          <h3 className="mt-1 line-clamp-2 text-lg font-semibold text-zinc-900">
            {post.title}
          </h3>
          <ul className="mt-2 flex flex-wrap gap-x-3 text-xs text-zinc-500">
            <li>By, Mark Admin</li>
            {date && <li>{date}</li>}
          </ul>
          {post.excerpt && (
            <p className="mt-3 line-clamp-3 text-sm text-zinc-600">{post.excerpt}</p>
          )}
        </div>
      </Link>
    </article>
  );
}
