"use client";

import { useMemo, useState } from "react";
import { BlogPostCard } from "@/components/marketing/blog-post-card";
import { BlogFeaturedPostCard } from "@/components/marketing/blog-featured-post-card";
import type { BlogPostSummary } from "@/server/services/blog.service";
import { cn } from "@/lib/utils";

export function BlogListClient({ posts }: { posts: BlogPostSummary[] }) {
  const categories = useMemo(() => {
    const names = new Set<string>();
    for (const post of posts) {
      if (post.categoryName) names.add(post.categoryName);
    }
    return Array.from(names).sort();
  }, [posts]);

  const [active, setActive] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      active ? posts.filter((post) => post.categoryName === active) : posts,
    [posts, active]
  );

  // Only pull out a featured post on the unfiltered "All" view — a filtered
  // category with just a couple of posts shouldn't lose one to a hero slot.
  const featured = active === null && filtered.length > 1 ? filtered[0] : null;
  const rest = featured ? filtered.slice(1) : filtered;

  if (!posts.length) {
    return <p className="mt-8 text-center text-zinc-500">No blog posts yet.</p>;
  }

  return (
    <>
      {categories.length > 1 ? (
        <div className="mt-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActive(null)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              active === null
                ? "border-brand bg-brand text-brand-foreground"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
            )}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActive(category)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                active === category
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      ) : null}
      {featured ? (
        <div className="mt-8">
          <BlogFeaturedPostCard post={featured} />
        </div>
      ) : null}
      <div className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-3", featured ? "mt-6" : "mt-8")}>
        {rest.map((post) => (
          <BlogPostCard key={post.id} post={post} />
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-500">
          No posts in this category yet.
        </p>
      ) : null}
    </>
  );
}
