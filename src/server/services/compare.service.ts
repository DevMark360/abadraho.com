import { prisma } from "@/lib/prisma";
import { clampIdList } from "@/lib/pagination";
import { listProjectsByIds } from "@/server/services/project.service";
import { getUnitsByProjectId } from "@/server/services/unit.service";
import type { CompareProjectPayload } from "@/types/compare";

export async function getCompareProjects(
  ids: number[],
  options?: { includeUnitDetails?: boolean; viewerUserId?: number | null }
): Promise<CompareProjectPayload[]> {
  if (!ids.length) return [];

  const includeUnitDetails = options?.includeUnitDetails ?? false;
  const idList = clampIdList(ids);
  const items = await listProjectsByIds(idList, options?.viewerUserId);
  const byId = new Map(items.map((p) => [p.id, p]));

  const payloads = await Promise.all(
    idList
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => p != null)
      .map(async (project) => {
        const units = includeUnitDetails
          ? await getUnitsByProjectId(project.id)
          : [];
        const hasUnits =
          units.length > 0 ||
          (await prisma.unit.count({
            where: { projectId: project.id, isArchive: false },
          })) > 0;

        return {
          ...project,
          units,
          hasUnits,
        };
      })
  );

  return payloads;
}
