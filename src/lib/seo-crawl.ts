import { getSiteUrl } from "@/lib/seo";

/** Paths that must never be indexed or crawled (private / auth / APIs). */
export const CRAWL_DISALLOW_PATHS = [
  "/admin/",
  "/api/",
  "/account/",
  "/broker/",
  "/verify-email",
  "/reset-password",
  "/change-password/",
  "/email/",
  "/p/",
] as const;

export const SEARCH_ENGINE_BOTS = ["Googlebot", "Bingbot"] as const;

/** AI / LLM crawlers — allowed on public pages only (same disallow rules). */
export const AI_CRAWLER_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
] as const;

export const PUBLIC_SITEMAP_STATIC_PATHS = [
  { path: "/", priority: 1, changeFrequency: "daily" as const },
  { path: "/projects", priority: 0.95, changeFrequency: "daily" as const },
  { path: "/about-us", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/contact", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/blog", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/compare", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/terms-conditions", priority: 0.4, changeFrequency: "yearly" as const },
  { path: "/privacy-policy", priority: 0.4, changeFrequency: "yearly" as const },
];

export function sitemapXmlUrl(): string {
  return `${getSiteUrl()}/sitemap.xml`;
}

export function robotsDisallowList(): string[] {
  return [...CRAWL_DISALLOW_PATHS];
}
