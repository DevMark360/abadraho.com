import { isDatabaseEnabled } from "@/lib/db";
import { normalizePakistanCoords } from "@/lib/map-karachi";

import { v2ProjectAssetUrl } from "@/lib/project-media";

import { prisma } from "@/lib/prisma";

import {

  buildProjectWhere,

  parseProjectFilters,

} from "@/server/services/project-filter.service";

import { resolveViewerProjectFilters } from "@/server/services/project-scope.service";

import type { ProjectListItem } from "@/types/project";



export interface MapProject extends ProjectListItem {

  coverImage?: string | null;

}



function coord(value: unknown): number | null {

  if (value == null) return null;

  const n = Number(value);

  return Number.isFinite(n) ? n : null;

}



function mapDbMapItem(p: {

  id: number;

  name: string;

  slug: string;

  address: string | null;

  latitude: unknown;

  longitude: unknown;

  projectCoverImg: string | null;

  minPrice: unknown;

  discountPrice: unknown;

  installmentLength: number | null;

  progress?: { name: string } | null;

  location?: { name: string } | null;

}): MapProject {

  const normalized = normalizePakistanCoords(coord(p.latitude), coord(p.longitude));
  const lat = normalized?.lat ?? null;
  const lng = normalized?.lng ?? null;

  const minPrice =

    Number(p.minPrice) > 0

      ? Number(p.minPrice)

      : Number(p.discountPrice) > 0

        ? Number(p.discountPrice)

        : null;



  return {

    id: p.id,

    name: p.name,

    slug: p.slug,

    area: p.location?.name ?? null,

    address: p.address,

    imageUrl: v2ProjectAssetUrl(p.projectCoverImg),

    coverImage: p.projectCoverImg,

    minPrice,

    maxPrice: null,

    progressName: p.progress?.name ?? null,

    builderName: null,

    handoverLabel: p.installmentLength

      ? `${Math.ceil(p.installmentLength / 12)}y plan`

      : null,

    installmentMonths: p.installmentLength,

    views: 0,

    latitude: lat,

    longitude: lng,

    paymentPlan: "60/40%",

  };

}



async function fetchMapProjectsFromDb(

  filters: ReturnType<typeof parseProjectFilters> = {}

): Promise<MapProject[]> {

  const where = await buildProjectWhere(filters);



  const rows = await prisma.project.findMany({

    where,

    select: {

      id: true,

      name: true,

      slug: true,

      address: true,

      latitude: true,

      longitude: true,

      projectCoverImg: true,

      minPrice: true,

      discountPrice: true,

      installmentLength: true,

      progress: { select: { name: true } },

      location: { select: { name: true } },

    },

    orderBy: { id: "desc" },

  });



  return rows

    .map(mapDbMapItem)

    .filter((p) => p.latitude != null && p.longitude != null);

}



function queryStringToFilterParams(

  queryString: string

): Record<string, string | undefined> {

  const params: Record<string, string | undefined> = {};

  new URLSearchParams(queryString).forEach((v, k) => {

    params[k] = v;

  });

  return params;

}



export async function fetchMapProjects(
  queryString = "",
  userId?: number | null
): Promise<MapProject[]> {
  const filters = await resolveViewerProjectFilters({
    ...parseProjectFilters(queryStringToFilterParams(queryString)),
    ...(userId ? { viewerUserId: userId } : {}),
  });

  if (!isDatabaseEnabled()) return [];



  try {

    return await fetchMapProjectsFromDb(filters);

  } catch {

    return [];

  }

}


