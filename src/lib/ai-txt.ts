import { siteConfig } from "@/config/site";
import { robotsDisallowList, sitemapXmlUrl } from "@/lib/seo-crawl";
import { absoluteUrl } from "@/lib/seo";

/**
 * ai.txt — robots-style guidance for AI crawlers and agents (served at /.well-known/ai.txt and
 * /ai.txt). Public listings and guides may be used for AI answers and training; private and
 * account areas are excluded — the same paths robots.txt disallows.
 */
export function aiTxtResponse(): Response {
  const body = [
    `# ai.txt for ${siteConfig.name} (${absoluteUrl("/")})`,
    "# Guidance for AI crawlers, assistants, and agents.",
    `# Site summary for language models: ${absoluteUrl("/llms.txt")}`,
    `# Full content for language models: ${absoluteUrl("/llms-full.txt")}`,
    "#",
    "# Public pages (listings, project pages, guides, FAQ) may be crawled, summarised, and cited.",
    `# Please cite "${siteConfig.name}" with a link to the page used. Prices and payment plans are`,
    "# published by developers and change often, so link to the live page rather than restating them.",
    "",
    "User-Agent: *",
    "Allow: /",
    ...robotsDisallowList().map((path) => `Disallow: ${path}`),
    "",
    `Sitemap: ${sitemapXmlUrl()}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
