import { isDatabaseEnabled } from "@/lib/db";
import {
  resolveProjectDocuments,
  resolveProjectImageUrls,
  youtubeEmbedUrl,
} from "@/lib/project-media";
import { getMockDetail } from "@/server/services/legacy-api.service";
import {
  mapDbProjectToDetail,
  mapDbProjectToListItem,
  projectInfoFromRaw,
} from "@/server/services/project-mapper";
import { loadAreaNamesByProjectIds } from "@/server/services/project-area.service";
import { prisma } from "@/lib/prisma";
import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { getSimilarProjects } from "@/server/services/similar-projects.service";
import type { ProjectListItem } from "@/types/project";
import type { ProjectDetail, ProjectVideoItem } from "@/types/project-detail";
import type { Prisma } from "@prisma/client";
import { approvedReviewWhere } from "@/lib/review-status";

/** Core include — omit `videos` (table may be missing on some DB dumps) */
export const DETAIL_CORE_INCLUDE = {
          location: true,
          progress: true,
  projectType: true,
  projectTags: { include: { tag: true } },
  units: {
    where: { isArchive: false },
    include: {
      unitType: true,
      roomTypeUnits: {
        where: { isArchive: false, isDisplayOnListing: true },
        include: { roomType: true },
      },
    },
    orderBy: { id: "asc" as const },
  },
          owners: { include: { builder: true } },
          reviews: { where: approvedReviewWhere },
          projectAmenities: { include: { amenity: true } },
  projectUtilities: { include: { utility: true } },
} as const;

type ProjectRow = Prisma.ProjectGetPayload<{
  include: typeof DETAIL_CORE_INCLUDE;
}>;

let videosTableAvailable: boolean | null = null;

async function hasVideosTable(): Promise<boolean> {
  if (videosTableAvailable != null) return videosTableAvailable;
  try {
    const rows = await prisma.$queryRaw<{ cnt: bigint }[]>`
      SELECT COUNT(*) AS cnt FROM information_schema.tables
      WHERE table_schema = DATABASE() AND table_name = 'videos'
    `;
    videosTableAvailable = Number(rows[0]?.cnt ?? 0) > 0;
  } catch {
    videosTableAvailable = false;
  }
  return videosTableAvailable;
}

async function loadOptionalVideos(projectId: number): Promise<ProjectVideoItem[]> {
  if (!(await hasVideosTable())) return [];
  try {
    const rows = await queryRaw<
      { id: number; title: string; url: string; description: string | null }[]
    >(
      `SELECT id, title, url, description FROM videos WHERE project_id = ? ORDER BY id ASC`,
      projectId
    );
    return rows.map((v) => ({
      id: v.id,
      title: v.title,
      url: v.url,
      embedUrl: youtubeEmbedUrl(v.url),
      description: v.description,
    }));
  } catch {
    return [];
  }
}

async function loadDetailExtras(projectId: number) {
  type InfoRow = {
    main_heading: string | null;
    sub_heading: string | null;
    bullet_1: string | null;
    bullet_2: string | null;
    bullet_3: string | null;
    bullet_4: string | null;
    bullet_5: string | null;
    bullet_6: string | null;
  };
  type ExtraRow = {
    meta_tags: string | null;
    marketed_by: string | null;
  };

  const [areaNamesMap, infoRows, extraRows] = await Promise.all([
    loadAreaNamesByProjectIds([projectId]),
    queryRaw<InfoRow[]>(
      `SELECT main_heading, sub_heading, bullet_1, bullet_2, bullet_3, bullet_4, bullet_5, bullet_6
       FROM project_infos WHERE project_id = ? LIMIT 1`,
      projectId
    ),
    queryRaw<ExtraRow[]>(
      `SELECT meta_tags, marketed_by FROM projects WHERE id = ? LIMIT 1`,
      projectId
    ),
  ]);

        return {
    areaNames: areaNamesMap.get(projectId) ?? null,
    projectInfo: projectInfoFromRaw(infoRows[0]),
    marketedBy: extraRows[0]?.marketed_by?.trim() || null,
    metaKeywords: extraRows[0]?.meta_tags?.trim() || null,
  };
}

async function getProjectDetailFromDb(slug: string): Promise<ProjectDetail | null> {
  const project = await prisma.project.findFirst({
    where: { slug, isArchive: false, status: 1 },
    include: DETAIL_CORE_INCLUDE,
  });
  if (!project) return null;

  let similar: ProjectListItem[] = [];
  try {
    similar = await getSimilarProjects(project.id, 4);
  } catch (err) {
    console.error("[getProjectDetail] similar projects failed:", err);
  }

  const [videos, extras] = await Promise.all([
    loadOptionalVideos(project.id),
    loadDetailExtras(project.id),
  ]);
  return mapDbProjectToDetail(project as ProjectRow, similar, videos, extras);
}

export async function getProjectDetail(slug: string): Promise<ProjectDetail | null> {
  if (isDatabaseEnabled()) {
    try {
      const db = await getProjectDetailFromDb(slug);
      if (db) return db;
    } catch (err) {
      console.error("[getProjectDetail] DB load failed:", err);
    }
  }

  return getMockDetail(slug);
}

export { mapDbProjectToListItem };
