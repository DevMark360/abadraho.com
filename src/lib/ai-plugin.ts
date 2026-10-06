import { BRAND_LOGO } from "@/config/brand";
import { businessConfig } from "@/config/business";
import { siteConfig } from "@/config/site";
import { absoluteUrl } from "@/lib/seo";

/**
 * /.well-known/ai-plugin.json + /.well-known/openapi.json: the (legacy) ChatGPT plugin manifest
 * format, kept for AI/GEO checkers. Describes only the public, read-only project search API.
 */
export function aiPluginManifest() {
  return {
    schema_version: "v1",
    name_for_human: siteConfig.name,
    name_for_model: "abadraho",
    description_for_human:
      "Search and compare off-plan property projects in Karachi and Pakistan.",
    description_for_model: `Search ${siteConfig.name}'s public listings of off-plan (pre-launch and under-construction) property projects in Karachi and Pakistan, operated by ${businessConfig.legalName}. Use searchProjects with a free-text query (project, area, or developer name) and optional price range (PKR) or unit type. Results are read-only. Prices and payment plans are published by developers and change often, so always link users to the project page (${absoluteUrl("/project/")}{slug}) for current details.`,
    auth: { type: "none" },
    api: { type: "openapi", url: absoluteUrl("/.well-known/openapi.json") },
    logo_url: absoluteUrl(BRAND_LOGO.src),
    contact_email: businessConfig.email,
    legal_info_url: absoluteUrl("/terms-conditions"),
  };
}

export function aiPluginOpenApi() {
  const project = {
    type: "object",
    properties: {
      id: { type: "integer" },
      name: { type: "string" },
      slug: { type: "string", description: "Project page: /project/{slug}" },
      area: { type: "string", nullable: true },
      address: { type: "string", nullable: true },
      minPrice: {
        type: "number",
        nullable: true,
        description: "Starting price in PKR",
      },
      maxPrice: {
        type: "number",
        nullable: true,
        description: "Highest price in PKR",
      },
      progressName: {
        type: "string",
        nullable: true,
        description: "Construction stage",
      },
      builderName: { type: "string", nullable: true, description: "Developer" },
      handoverLabel: { type: "string", nullable: true },
      installmentMonths: {
        type: "integer",
        nullable: true,
        description: "Payment plan length",
      },
      imageUrl: { type: "string", nullable: true },
    },
  };

  return {
    openapi: "3.0.1",
    info: {
      title: `${siteConfig.name} project search`,
      description:
        "Public, read-only search of off-plan property projects in Pakistan.",
      version: "1.0.0",
    },
    servers: [{ url: absoluteUrl("/").replace(/\/$/, "") }],
    paths: {
      "/api/v1/projects": {
        get: {
          operationId: "searchProjects",
          summary: "Search off-plan projects",
          parameters: [
            {
              name: "q",
              in: "query",
              schema: { type: "string" },
              description: "Project, area, or developer name",
            },
            {
              name: "minPrice",
              in: "query",
              schema: { type: "number" },
              description: "Minimum price in PKR",
            },
            {
              name: "maxPrice",
              in: "query",
              schema: { type: "number" },
              description: "Maximum price in PKR",
            },
            {
              name: "unitType",
              in: "query",
              schema: { type: "string" },
              description:
                "Unit type ID: 11 = apartments, 3 = plots, 2 = houses, 6 = commercial",
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", minimum: 1 },
            },
            {
              name: "perPage",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100 },
            },
          ],
          responses: {
            "200": {
              description: "Matching projects",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: { type: "array", items: project },
                      meta: {
                        type: "object",
                        properties: { total: { type: "integer" } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}
