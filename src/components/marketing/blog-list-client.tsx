"use client";

import { useMemo, useState } from "react";
import { BlogPostCard } from "@/components/marketing/blog-post-card";
import { BlogFeaturedPostCard } from "@/components/marketing/blog-featured-post-card";
import type { BlogPostSummary } from "@/server/services/blog.service";
import { designTw } from "@/config/design-tokens";
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
        <div className="mt-2 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setActive(null)}
            className={cn(
              "min-h-9 rounded-full px-4 py-1.5 text-xs font-semibold transition",
              active === null
                ? designTw.navActive
                : "border border-white/80 bg-clay-surface text-zinc-700 shadow-clay-sm hover:shadow-clay"
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
                "min-h-9 rounded-full px-4 py-1.5 text-xs font-semibold transition",
                active === category
                  ? designTw.navActive
                  : "border border-white/80 bg-clay-surface text-zinc-700 shadow-clay-sm hover:shadow-clay"
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
