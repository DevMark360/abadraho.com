import type { NextRequest } from "next/server";
import { getSiteUrl, isLocalSiteUrl, resolvePublicSiteUrl } from "@/lib/seo";

/** Best public base URL for the current request (proxy-aware on cPanel). */
export function resolveRequestSiteUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
  if (forwardedHost && !forwardedHost.includes("localhost")) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, "");
  }

  const host = request.headers.get("host")?.trim();
  if (host && !host.includes("localhost")) {
    const proto = request.nextUrl.protocol?.replace(":", "") || "https";
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  return resolvePublicSiteUrl(request.nextUrl.origin);
}

export { getSiteUrl, resolvePublicSiteUrl, isLocalSiteUrl };
