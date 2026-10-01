import type { Prisma } from "@prisma/client";
import type { ProjectFilters } from "@/types/project";
import { parseCsv, parseProjectFilters } from "@/lib/project-filter-params";
import {
  projectIdsMatchingAreas,
  projectIdsMatchingCities,
} from "@/server/services/project-area.service";

export { parseCsv, parseProjectFilters };

function slugToSearchLabel(slug: string): string {
  return slug.replace(/-/g, " ");
}

/** One Prisma branch per active filter; combined with OR when 2+ filters are set. */
export async function buildProjectWhere(
  filters: ProjectFilters
): Promise<Prisma.ProjectWhereInput> {
  const base: Prisma.ProjectWhereInput = {
    isArchive: false,
    status: 1,
  };
  const branches: Prisma.ProjectWhereInput[] = [];

  if (filters.query) {
    const q = filters.query;
    branches.push({
      OR: [
        { name: { contains: q } },
        { address: { contains: q } },
        { location: { name: { contains: q } } },
        { owners: { some: { builder: { fullName: { contains: q } } } } },
      ],
    });
  }

  if (filters.areaIds?.length) {
    const ids = await projectIdsMatchingAreas(filters.areaIds);
    if (ids.length) {
      branches.push({ id: { in: ids } });
    }
  }

  if (filters.cityIds?.length) {
    const ids = await projectIdsMatchingCities(filters.cityIds);
    // Unlike the areaIds branch above, push this unconditionally — a city with zero
    // matching projects must restrict results to none, not silently drop the filter
    // (an empty `in: []` correctly matches nothing in Prisma).
    branches.push({ id: { in: ids } });
  }

  if (filters.developerIds?.length) {
    branches.push({
      owners: { some: { builderId: { in: filters.developerIds } } },
    });
  }

  if (filters.unitTypeIds?.length) {
    branches.push({ projectTypeId: { in: filters.unitTypeIds } });
  }

  if (filters.tiers?.length) {
    branches.push({ tier: { in: filters.tiers } });
  }

  if (filters.progressIds?.length) {
    branches.push({ progressStatusId: { in: filters.progressIds } });
  } else if (filters.statusFilters?.length) {
    branches.push({
      OR: filters.statusFilters.flatMap((s) => {
        const label = slugToSearchLabel(s);
        return [
          { progress: { name: { contains: label } } },
          { progressLabel: { contains: label } },
        ];
      }),
    });
  }

  if (filters.planMonths?.length) {
    branches.push({
      OR: filters.planMonths.map((months) => ({
        installmentLength: {
          gte: months,
          lt: months + 12,
        },
      })),
    });
  }

  if (filters.bedroomFilters?.length) {
    const roomConds: Prisma.UnitWhereInput[] = [];
    for (const b of filters.bedroomFilters) {
      if (b === "studio") {
        roomConds.push({
          OR: [
            { rooms: { contains: "studio" } },
            { rooms: { equals: "0" } },
          ],
        });
      } else if (b === "5+") {
        roomConds.push({
          OR: [
            { rooms: { in: ["5", "6", "7", "8"] } },
            { rooms: { contains: "5" } },
            { rooms: { contains: "6" } },
            { rooms: { contains: "7" } },
            { rooms: { contains: "8" } },
          ],
        });
      } else {
        roomConds.push({
          OR: [
            { rooms: { equals: b } },
            { rooms: { startsWith: b } },
            { rooms: { contains: `${b} ` } },
          ],
        });
      }
    }
    branches.push({
      units: { some: { AND: [{ isArchive: false }, { OR: roomConds }] } },
    });
  }

  if (filters.minPrice != null || filters.maxPrice != null) {
    const min = filters.minPrice ?? 0;
    const max = filters.maxPrice ?? 999_999_999_999;
    branches.push({
      OR: [
        {
          units: {
            some: { isArchive: false, price: { gt: 0, gte: min, lte: max } },
          },
        },
        { minPrice: { gt: 0, gte: min, lte: max } },
        { discountPrice: { gt: 0, gte: min, lte: max } },
      ],
    });
  }

  if (filters.minDownPayment != null || filters.maxDownPayment != null) {
    const min = filters.minDownPayment ?? 0;
    const max = filters.maxDownPayment ?? 999_999_999_999;
    branches.push({
      units: {
        some: {
          isArchive: false,
          downPayment: { gte: min, lte: max },
        },
      },
    });
  }

  if (filters.minMonthlyInstallment != null || filters.maxMonthlyInstallment != null) {
    const min = filters.minMonthlyInstallment ?? 0;
    const max = filters.maxMonthlyInstallment ?? 999_999_999_999;
    branches.push({
      units: {
        some: {
          isArchive: false,
          monthlyInstallment: { gte: min, lte: max },
        },
      },
    });
  }

  if (!branches.length) {
    return restrictToAllowedProjectIds(base, filters.allowedProjectIds);
  }
  const merged =
    branches.length === 1 ? { ...base, AND: [branches[0]] } : { ...base, OR: branches };
  return restrictToAllowedProjectIds(merged, filters.allowedProjectIds);
}

function restrictToAllowedProjectIds(
  where: Prisma.ProjectWhereInput,
  allowedProjectIds?: number[]
): Prisma.ProjectWhereInput {
  if (allowedProjectIds === undefined) return where;
  const ids = allowedProjectIds.length ? allowedProjectIds : [-1];
  return { AND: [where, { id: { in: ids } }] };
}
