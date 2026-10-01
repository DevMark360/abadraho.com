import type { MetadataRoute } from "next";
import { isDatabaseEnabled } from "@/lib/db";
import { getSiteUrl } from "@/lib/seo";
import { PUBLIC_SITEMAP_STATIC_PATHS } from "@/lib/seo-crawl";
import { listBlogPosts } from "@/server/services/blog.service";
import { listAreasWithProjects } from "@/server/services/area-page.service";
import { listPublicBuilderSlugs } from "@/server/services/builder-page.service";
import { builderPublicPath } from "@/config/builder-pages";
import { prisma } from "@/lib/prisma";

function sitemapEntry(
  path: string,
  options: {
    lastModified?: Date | null;
    changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority?: number;
  } = {}
): MetadataRoute.Sitemap[number] {
  const base = getSiteUrl();
  const url = path ? `${base}${path.startsWith("/") ? path : `/${path}`}` : base;

  return {
    url,
    lastModified: options.lastModified ?? new Date(),
    changeFrequency: options.changeFrequency ?? "weekly",
    priority: options.priority ?? 0.6,
  };
}

async function listPublicProjectPaths(): Promise<
  Array<{ slug: string; updatedAt: Date | null }>
> {
  if (!isDatabaseEnabled()) return [];

  try {
    const rows = await prisma.project.findMany({
      where: { isArchive: false, status: 1 },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
    return rows
      .filter((row) => row.slug?.trim())
      .map((row) => ({
        slug: row.slug!.trim(),
        updatedAt: row.updatedAt,
      }));
  } catch {
    return [];
  }
}

export async function buildPublicSitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = PUBLIC_SITEMAP_STATIC_PATHS.map((route) =>
    sitemapEntry(route.path, {
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })
  );

  const [projects, blogPosts, areas, builders] = await Promise.all([
    listPublicProjectPaths(),
    listBlogPosts(500),
    listAreasWithProjects(),
    listPublicBuilderSlugs(),
  ]);

  const projectEntries = projects.map((project) =>
    sitemapEntry(`/project/${project.slug}`, {
      lastModified: project.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    })
  );

  const blogEntries = blogPosts
    .filter((post) => post.categorySlug && post.slug)
    .map((post) =>
      sitemapEntry(`/blog/${post.categorySlug}/${post.slug}`, {
        lastModified: post.createdAt,
        changeFrequency: "monthly",
        priority: 0.6,
      })
    );

  const areaEntries = areas.map((area) =>
    sitemapEntry(`/area/${area.slug}`, {
      changeFrequency: "weekly",
      priority: 0.75,
    })
  );

  const builderEntries = builders.map((builder) =>
    sitemapEntry(builderPublicPath(builder.slug), {
      changeFrequency: "weekly",
      priority: 0.7,
    })
  );

  return [...staticEntries, ...projectEntries, ...blogEntries, ...areaEntries, ...builderEntries];
}
