import type { MetadataRoute } from "next";
import {
  AI_CRAWLER_BOTS,
  robotsDisallowList,
  SEARCH_ENGINE_BOTS,
  sitemapXmlUrl,
} from "@/lib/seo-crawl";
import { getSiteUrl } from "@/lib/seo";

type RobotsRule = {
  userAgent: string;
  allow: string[];
  disallow: string[];
};

function crawlRule(userAgent: string): RobotsRule {
  return {
    userAgent,
    allow: ["/"],
    disallow: robotsDisallowList(),
  };
}

export default function robots(): MetadataRoute.Robots {
  const namedBots = [...SEARCH_ENGINE_BOTS, ...AI_CRAWLER_BOTS];

  return {
    rules: [
      crawlRule("*"),
      ...namedBots.map((bot) => crawlRule(bot)),
    ],
    sitemap: sitemapXmlUrl(),
    host: getSiteUrl(),
  };
}
