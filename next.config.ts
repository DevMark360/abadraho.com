import type { NextConfig } from "next";
import { ADMIN_MAX_MEDIA_REQUEST_BYTES } from "./src/lib/admin-upload-limits";
// import path from "node:path";
// import { fileURLToPath } from "node:url";
import { getSecurityHeaders } from "./src/lib/security-headers";

/** Force Turbopack to use abadraho-v2 (not parent repo lockfile) */
// const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** Must exceed largest admin media upload (middleware default is only 10MB). */
const adminMediaBodyLimit = ADMIN_MAX_MEDIA_REQUEST_BYTES;

/**
 * Crawlers that get fully-rendered metadata in <head> (no metadata streaming). Besides better
 * crawling, this lets notFound() in generateMetadata send a real 404 status to them (a page
 * that streams its metadata has already answered 200). Next.js default list + Google + AI
 * crawlers + generic bot / fetch-library user agents.
 */
const CRAWLER_UA =
  /Mediapartners-Google|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Googlebot|Google-Extended|GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai|PerplexityBot|Perplexity-User|CCBot|Amazonbot|Bytespider|meta-externalagent|cohere-ai|bot[\/;)]|crawler|spider|curl\/|wget|python-requests|axios|node-fetch|Go-http-client/i;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  htmlLimitedBots: CRAWLER_UA,
  eslint: {
    // Run `npm run lint` separately — saves RAM during `next build` on low-memory machines
    ignoreDuringBuilds: true,
  },
  experimental: {
    // cPanel/CloudLinux LVE: avoid EAGAIN during `next build`
    workerThreads: false,
    cpus: 1,
    serverActions: {
      bodySizeLimit: adminMediaBodyLimit,
    },
    middlewareClientMaxBodySize: adminMediaBodyLimit,
    optimizePackageImports: [
      "lucide-react",
      "lottie-react",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-slider",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: getSecurityHeaders(),
      },
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // Turbopack dev-mode chunk filenames aren't content-hashed the way production build
      // output is — the same URL can serve different content across an HMR rebuild. An
      // immutable cache here made Chrome permanently skip re-fetching updated chunks during
      // local development, so edits stopped showing up in the browser until a manual cache
      // clear. Production builds still get the long-lived immutable cache.
      ...(process.env.NODE_ENV === "production"
        ? [
            {
              source: "/_next/static/:path*",
              headers: [
                {
                  key: "Cache-Control",
                  value: "public, max-age=31536000, immutable",
                },
              ],
            },
          ]
        : []),
    ];
  },
  async redirects() {
    return [
      { source: "/blogs", destination: "/blog", permanent: true },
      { source: "/builder/:slug", destination: "/:slug", permanent: true },
      // Old duplicate builder page at a misspelled URL; the real page is the [slug] route.
      { source: "/roomi-bulder", destination: "/roomi-builder", permanent: true },
      { source: "/admin/change-password", destination: "/admin/admin-change-password", permanent: false },
      { source: "/admin/profile", destination: "/admin/admin-profile", permanent: false },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/update-admin-password",
        destination: "/api/admin/update-admin-password",
      },
      {
        source: "/my-admin-profile-update",
        destination: "/api/admin/my-admin-profile-update",
      },
      { source: "/import-areas", destination: "/api/admin/import/areas" },
      { source: "/import-units", destination: "/api/admin/import/units" },
      { source: "/import-types", destination: "/api/admin/import/types" },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  // typedRoutes: true, // disabled — causes build failure with /_not-found in Next 15
};

export default nextConfig;