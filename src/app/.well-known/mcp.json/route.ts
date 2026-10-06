import { mcpManifest } from "@/lib/mcp-manifest";

// Per request so URLs use the server's runtime site URL (see getSiteUrl).
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(mcpManifest(), {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" },
  });
}
