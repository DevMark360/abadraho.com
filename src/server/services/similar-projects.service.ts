import type { Prisma } from "@prisma/client";
import { isDatabaseEnabled } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { mapDbProjectToListItem } from "@/server/services/project-mapper";
import { uniqueById } from "@/lib/unique-by-id";
import type { ProjectListItem } from "@/types/project";

const DETAIL_INCLUDE = {
  location: true,
  progress: true,
  units: {
    where: { isArchive: false },
    take: 1,
    include: { unitType: true },
  },
  owners: { include: { builder: true } },
} as const;

/**
 * Similar projects — legacy API logic ported to Prisma:
 * same unit_type_id on units, same area, or same progress status.
 */
export async function getSimilarProjects(
  projectId: number,
  limit = 4
): Promise<ProjectListItem[]> {
  if (!isDatabaseEnabled()) return [];

  const source = await prisma.project.findFirst({
    where: { id: projectId, isArchive: false },
    include: { units: { where: { isArchive: false } } },
  });
  if (!source) return [];

  const unitTypeIds = [
    ...new Set(
      source.units
        .map((u) => u.unitTypeId)
        .filter((id): id is number => id != null)
    ),
  ];

  const or: Prisma.ProjectWhereInput[] = [];

  if (unitTypeIds.length) {
    or.push({
      units: {
        some: {
          isArchive: false,
          unitTypeId: { in: unitTypeIds },
        },
      },
    });
  }

  if (source.areaId != null) {
    or.push({ areaId: source.areaId });
  }

  if (source.progressStatusId != null) {
    or.push({ progressStatusId: source.progressStatusId });
  }

  if (!or.length) return [];

  const rows = await prisma.project.findMany({
    where: {
      id: { not: projectId },
      isArchive: false,
      OR: or,
    },
    include: DETAIL_INCLUDE,
    take: limit,
    orderBy: { views: "desc" },
  });

  return uniqueById(rows.map((p) => mapDbProjectToListItem(p as never)));
}
