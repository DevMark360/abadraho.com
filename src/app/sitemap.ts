import type { MetadataRoute } from "next";
import { buildPublicSitemap } from "@/server/services/sitemap.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildPublicSitemap();
}
