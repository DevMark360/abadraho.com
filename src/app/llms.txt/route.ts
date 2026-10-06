import { businessConfig } from "@/config/business";
import { popularPlaces, propertyCategories } from "@/config/marketing";
import { siteConfig } from "@/config/site";
import { trustStats } from "@/config/trust-signals";
import { absoluteUrl } from "@/lib/seo";

/**
 * /llms.txt (https://llmstxt.org) — a plain-Markdown map of the site for AI systems.
 * Built from config only (no database), so it is fast. Rendered per request (not at build time)
 * so links use the server's runtime APP_URL / AUTH_URL (see getSiteUrl), even when the build
 * machine has no .env.
 */
export const dynamic = "force-dynamic";

function link(title: string, path: string, note?: string): string {
  return `- [${title}](${absoluteUrl(path)})${note ? `: ${note}` : ""}`;
}

export function GET() {
  const stats = trustStats
    .filter((s) => s.label !== "Market focus") // already stated as "market focus Karachi"
    .map((s) => `${s.value} ${s.label.toLowerCase()}`)
    .join(", ");

  const body = [
    `# ${siteConfig.name}`,
    "",
    `> ${siteConfig.name} is a search and comparison platform for off-plan property in Pakistan, operated by ${businessConfig.legalName} in Karachi, Sindh. Buyers browse verified pre-launch and under-construction projects, compare payment plans (down payment, installment length, monthly amounts), and get free advice from ${businessConfig.legalName} advisors.`,
    "",
    `Key facts: operator ${businessConfig.legalName}; market focus Karachi and Pakistan; ${stats}. Browsing, comparing, and sending inquiries are free for buyers. Prices and payment plans are published by each developer. The sale contract is between the buyer and the developer, not ${siteConfig.name}. Contact: ${businessConfig.email}.`,
    "",
    "## Main pages",
    link(
      "Home",
      "/",
      "overview, live listing statistics, buyer's guide, and FAQ",
    ),
    link(
      "Off-plan projects",
      "/projects",
      "all listings with filters for area, budget, unit type, handover date, and payment plan; map view available",
    ),
    link(
      "Compare projects",
      "/compare",
      "compare 2 projects and their units side by side",
    ),
    link(
      "About AbadRaho",
      "/about-us",
      `who operates the platform (${businessConfig.legalName}) and how it works`,
    ),
    link(
      "Contact",
      "/contact",
      "inquiries, site visits, and builder partnerships",
    ),
    "",
    "## Property types",
    ...propertyCategories.map((c) => link(c.title, c.href, c.description)),
    "",
    "## Popular areas in Karachi",
    ...popularPlaces.map((p) =>
      link(p.name, p.href, `off-plan projects in ${p.name}`),
    ),
    "",
    "## Guides and updates",
    link(
      "Blog",
      "/blog",
      "buyer guides on payment plans, areas, and evaluating developers",
    ),
    link(
      "Events",
      "/events",
      "project launches and open houses from builder partners",
    ),
    "",
    "## Policies",
    link("Terms & conditions", "/terms-conditions"),
    link("Privacy policy", "/privacy-policy"),
    "",
    "## Optional",
    link(
      "Full content (llms-full.txt)",
      "/llms-full.txt",
      "FAQ, buyer's guide, listing statistics, and every live project in one document"
    ),
    link("Short version (llms-small.txt)", "/llms-small.txt"),
    link("AI crawler guidance (ai.txt)", "/.well-known/ai.txt"),
    link("Agent tools, read-only (mcp.json)", "/.well-known/mcp.json"),
    link(
      "Sitemap",
      "/sitemap.xml",
      "every public project, area, and article URL",
    ),
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
