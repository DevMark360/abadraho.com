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
/**
 * AI crawlers named explicitly in robots.txt (all allowed on public pages). Named groups override
 * "*", so each repeats the same private-path disallows. Bytespider is deliberately not listed:
 * the host already blocks it (403) for ignoring robots.txt.
 */
export const AI_CRAWLER_BOTS = [
  // OpenAI
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  // Anthropic
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  // Perplexity
  "PerplexityBot",
  "Perplexity-User",
  // Google Gemini / AI Overviews training control
  "Google-Extended",
  // Apple Intelligence / Siri
  "Applebot",
  "Applebot-Extended",
  // Amazon (Alexa, Rufus)
  "Amazonbot",
  // Meta AI
  "Meta-ExternalAgent",
  // Common Crawl (used by many AI models), Cohere, DuckDuckGo AI, Mistral
  "CCBot",
  "cohere-ai",
  "DuckAssistBot",
  "MistralAI-User",
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
