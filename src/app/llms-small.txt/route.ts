import { businessConfig } from "@/config/business";
import { siteConfig } from "@/config/site";
import { absoluteUrl } from "@/lib/seo";

/**
 * /llms-small.txt — compact variant of /llms.txt for models with small context windows:
 * who we are, the key facts, and the handful of pages worth fetching. Config only (no DB);
 * per request so links use the server's runtime site URL.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const body = [
    `# ${siteConfig.name}`,
    "",
    `> Off-plan property search and comparison platform for Pakistan, operated by ${businessConfig.legalName} (Karachi, Sindh). Free for buyers: browse verified pre-launch and under-construction projects, compare payment plans, and get advisor support.`,
    "",
    `- [Projects](${absoluteUrl("/projects")}): all listings, filter by area, budget, unit type, handover, payment plan`,
    `- [Compare](${absoluteUrl("/compare")}): 2 projects side by side`,
    `- [About](${absoluteUrl("/about-us")}): operator and how it works`,
    `- [Contact](${absoluteUrl("/contact")}): inquiries and site visits (${businessConfig.email})`,
    `- [Full content](${absoluteUrl("/llms-full.txt")}): FAQ, buyer's guide, statistics, every live project`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
