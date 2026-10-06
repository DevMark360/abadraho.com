import { businessConfig } from "@/config/business";
import { siteConfig } from "@/config/site";
import { absoluteUrl } from "@/lib/seo";

/**
 * /.well-known/mcp.json: agent discovery manifest (emerging, not yet a fixed standard).
 * READ-ONLY by design: only public search plus public pages/resources. Deliberately excludes
 * anything with side effects or personal data (inquiries, contact, bookings, login, wishlist,
 * account, admin); those need a signed-in user and CSRF protection and are not for agents.
 * There is no MCP server; tools map to plain public HTTP GET endpoints.
 */
export function mcpManifest() {
  return {
    schema_version: "2025-draft",
    name: siteConfig.name,
    description: `${siteConfig.name} is a search and comparison platform for off-plan property in Pakistan, operated by ${businessConfig.legalName} in Karachi. Agents may search listings and read public pages. All tools are read-only.`,
    url: absoluteUrl("/"),
    contact: businessConfig.email,
    terms_of_service: absoluteUrl("/terms-conditions"),
    privacy_policy: absoluteUrl("/privacy-policy"),
    authentication: { type: "none" },
    capabilities: { read_only: true, transactions: false },
    tools: [
      {
        name: "search_projects",
        description:
          "Search public off-plan property listings by project, area, or developer name, with an optional price range (PKR) and unit type. Returns names, slugs, areas, prices, stage, developer, and handover info. Link users to the project page for current details.",
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        endpoint: { method: "GET", url: absoluteUrl("/api/v1/projects") },
        inputSchema: {
          type: "object",
          properties: {
            q: {
              type: "string",
              description: "Project, area, or developer name",
            },
            minPrice: { type: "number", description: "Minimum price in PKR" },
            maxPrice: { type: "number", description: "Maximum price in PKR" },
            unitType: {
              type: "string",
              description:
                "Unit type ID: 11 = apartments, 3 = plots, 2 = houses, 6 = commercial",
            },
            page: { type: "integer", minimum: 1 },
            perPage: { type: "integer", minimum: 1, maximum: 100 },
          },
          additionalProperties: false,
        },
      },
    ],
    resources: [
      {
        name: "project_page",
        description:
          "Public project page (prices, units, payment plans, location). {slug} comes from search_projects.",
        uriTemplate: absoluteUrl("/project/{slug}"),
        mimeType: "text/html",
      },
      {
        name: "site_summary",
        uri: absoluteUrl("/llms.txt"),
        mimeType: "text/plain",
      },
      {
        name: "full_content",
        uri: absoluteUrl("/llms-full.txt"),
        mimeType: "text/plain",
      },
      {
        name: "openapi",
        uri: absoluteUrl("/.well-known/openapi.json"),
        mimeType: "application/json",
      },
      {
        name: "sitemap",
        uri: absoluteUrl("/sitemap.xml"),
        mimeType: "application/xml",
      },
    ],
  };
}
