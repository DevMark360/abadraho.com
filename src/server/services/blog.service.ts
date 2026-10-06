import { isDatabaseEnabled } from "@/lib/db";
import { legacyBlogImageUrl } from "@/lib/legacy-url";
import { queryRaw } from "@/lib/prisma-raw";

export interface BlogPostSummary {
  id: number;
  title: string;
  slug: string;
  categorySlug: string | null;
  categoryName: string | null;
  coverImg?: string | null;
  imageUrl: string | null;
  excerpt: string | null;
  createdAt: Date;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

const DEMO_POSTS: BlogPostSummary[] = [
  {
    id: 1,
    title: "Dubai off-plan market update",
    slug: "dubai-off-plan-market-update",
    categorySlug: "news",
    categoryName: "News",
    imageUrl: null,
    excerpt: "Latest trends in off-plan investments.",
    createdAt: new Date(),
  },
  {
    id: 2,
    title: "How to compare payment plans",
    slug: "compare-payment-plans",
    categorySlug: "guides",
    categoryName: "Guides",
    imageUrl: null,
    excerpt: "Side-by-side payment plan comparison tips.",
    createdAt: new Date(),
  },
];

type BlogRow = {
  id: number;
  title: string | null;
  slug: string | null;
  description: string | null;
  cover_img: string | null;
  created_at: Date | null;
  category_title: string | null;
};

function mapBlogRow(b: BlogRow): BlogPostSummary {
  return {
    id: b.id,
    title: b.title ?? "Untitled",
    slug: b.slug ?? String(b.id),
    categorySlug: b.category_title ? slugify(b.category_title) : null,
    categoryName: b.category_title,
    coverImg: b.cover_img,
    imageUrl: legacyBlogImageUrl(b.cover_img),
    excerpt: b.description?.replace(/<[^>]+>/g, "").slice(0, 160) ?? null,
    createdAt: b.created_at ? new Date(b.created_at) : new Date(),
  };
}

const PUBLISHED_BLOG_SQL = `
  SELECT b.id, b.title, b.slug, b.description, b.cover_img, b.created_at, b.updated_at,
         c.title AS category_title
  FROM blog b
  LEFT JOIN blog_category c ON c.id = b.category_id
  WHERE b.is_archive = 0
    AND (b.is_active = 1 OR b.is_active IS NULL)
`;

/**
 * Public URL path of a post (same rule as the blog pages: /blog/{category slug}/{slug}), whatever
 * its publish state. Used to ping search engines after admin edits; null if not found.
 */
export async function getBlogPublicPath(id: number): Promise<string | null> {
  if (!isDatabaseEnabled()) return null;
  try {
    const rows = await queryRaw<{ slug: string | null; category_title: string | null }[]>(
      `SELECT b.slug, c.title AS category_title
       FROM blog b LEFT JOIN blog_category c ON c.id = b.category_id
       WHERE b.id = ? LIMIT 1`,
      id
    );
    const row = rows[0];
    if (!row?.category_title) return null;
    return `/blog/${slugify(row.category_title)}/${row.slug ?? id}`;
  } catch {
    return null;
  }
}

export async function listBlogPosts(limit = 50): Promise<BlogPostSummary[]> {
  if (!isDatabaseEnabled()) return DEMO_POSTS.slice(0, limit);
  try {
    const rows = await queryRaw<BlogRow[]>(
      `${PUBLISHED_BLOG_SQL} ORDER BY b.id DESC LIMIT ?`,
      limit
    );
    return rows.map(mapBlogRow);
  } catch {
    return [];
  }
}

export async function getBlogPost(
  categorySlug: string,
  slug: string
): Promise<{
  title: string;
  content: string;
  categoryName: string | null;
  imageUrl: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
} | null> {
  if (!isDatabaseEnabled()) {
    const demo = DEMO_POSTS.find(
      (p) => p.slug === slug && p.categorySlug === categorySlug
    );
    if (demo) {
      return {
        title: demo.title,
        content: `<p>${demo.excerpt}</p>`,
        categoryName: demo.categoryName,
        imageUrl: null,
        createdAt: demo.createdAt,
        updatedAt: demo.createdAt,
      };
    }
    return null;
  }
  try {
    const rows = await queryRaw<
      (BlogRow & { updated_at: Date | null })[]
    >(
      `${PUBLISHED_BLOG_SQL} AND b.slug = ? ORDER BY b.id DESC LIMIT 1`,
      slug
    );
    const row = rows.find(
      (r) => !categorySlug || slugify(r.category_title ?? "") === categorySlug
    ) ?? rows[0];
    if (!row) return null;

    return {
      title: row.title ?? "Untitled",
      content: row.description ?? "",
      categoryName: row.category_title,
      imageUrl: legacyBlogImageUrl(row.cover_img),
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? row.created_at,
    };
  } catch {
    return null;
  }
}
