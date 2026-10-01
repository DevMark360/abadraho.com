import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { userTypeIds } from "@/config/site";
import {
  BUILDER_PROFILE_MISSING,
  builderProjectIdsForSession,
  resolveBuilderIdForUser,
} from "@/lib/admin-builder-ownership";
import { isBuilderSession, isFullStaff } from "@/lib/admin-rbac";
import type { AdminSession } from "@/lib/admin-session";
import {
  PROJECT_STATUS_BY_APPROVAL,
  PROJECT_STATUS_LABELS,
  type ProjectApprovalAction,
} from "@/config/project-status";
import { createNotification } from "@/server/services/notification.service";
import { ADMIN_BROADCAST, resolveRecipientForUser } from "@/lib/notifications/recipient";
import {
  loadAreaNamesByProjectIds,
  projectIdsMatchingAreas,
  toIntIds,
} from "@/server/services/project-area.service";
import { toJsonSafe } from "@/lib/prisma-json";
import { DEFAULT_ADMIN_TIMEZONE, parseDatetimeLocalInTimeZone } from "@/lib/admin-datetime-tz";
import { slugify } from "@/lib/slugify";

async function uniqueProjectSlug(base: string, excludeId?: number): Promise<string> {
  let slug = slugify(base) || "project";
  let n = 0;
  while (true) {
    const candidate = n ? `${slug}-${n}` : slug;
    const existing = await prisma.project.findFirst({
      where: {
        slug: candidate,
        ...(excludeId != null ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    n++;
  }
}

export { PROJECT_STATUS_LABELS };

export type ProjectListFilters = {
  page?: number;
  perPage?: number;
  search?: string;
  ids?: number[];
  areaIds?: number[];
  progressIds?: number[];
  statuses?: number[];
  from?: string;
  to?: string;
  /** Fixed status filter for pending/active list pages */
  fixedStatus?: number;
};

function parseIds(param: string | null): number[] | undefined {
  if (!param) return undefined;
  const ids = param
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  return ids.length ? ids : undefined;
}

export function parseProjectListQuery(searchParams: URLSearchParams): ProjectListFilters {
  return {
    page: Number(searchParams.get("page") ?? 1) || 1,
    perPage: Number(searchParams.get("perPage") ?? 50) || 50,
    search: searchParams.get("q") ?? undefined,
    ids: parseIds(searchParams.get("ids")),
    areaIds: parseIds(searchParams.get("areas")),
    progressIds: parseIds(searchParams.get("progress")),
    statuses: parseIds(searchParams.get("status")),
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    fixedStatus: searchParams.get("fixedStatus")
      ? Number(searchParams.get("fixedStatus"))
      : undefined,
  };
}

const projectListInclude = {
  progress: true,
  location: true,
  owners: { include: { builder: true } },
} as const;

async function loadAreaIdsForProject(projectId: number): Promise<string[]> {
  const rows = await queryRaw<{ area_id: bigint }[]>(
    `SELECT area_id FROM project_area WHERE project_id = ?`,
    projectId
  );
  return rows.map((r) => String(r.area_id));
}

export async function listAdminProjects(
  filters: ProjectListFilters,
  session?: AdminSession | null
) {
  if (!isDatabaseEnabled()) {
    return { items: [], total: 0, error: "Database disabled" };
  }

  const page = filters.page ?? 1;
  const perPage = Math.min(filters.perPage ?? 50, 200);
  const skip = (page - 1) * perPage;

  const where: Record<string, unknown> = { isArchive: false };

  if (filters.fixedStatus != null) {
    where.status = filters.fixedStatus;
  }
  if (filters.statuses?.length) {
    where.status = { in: toIntIds(filters.statuses) };
  }
  if (filters.ids?.length) {
    where.id = { in: toIntIds(filters.ids) };
  }
  if (filters.progressIds?.length) {
    where.progressStatusId = { in: toIntIds(filters.progressIds) };
  }
  if (filters.from && filters.to) {
    where.createdAt = {
      gte: new Date(filters.from),
      lte: new Date(`${filters.to}T23:59:59`),
    };
  }
  if (filters.areaIds?.length) {
    const areaProjectIds = await projectIdsMatchingAreas(filters.areaIds);
    const existingId = where.id as { in?: number[] } | undefined;
    if (existingId?.in?.length) {
      const set = new Set(areaProjectIds);
      const merged = existingId.in.filter((id) => set.has(id));
      where.id = { in: merged.length ? merged : [-1] };
    } else {
      where.id = { in: areaProjectIds.length ? areaProjectIds : [-1] };
    }
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { name: { contains: q } },
      { slug: { contains: q } },
      { address: { contains: q } },
    ];
  }

  if (session) {
    const scope = await builderProjectIdsForSession(session);
    if (scope !== undefined) {
      const allowed = toIntIds(scope);
      const idFilter = filters.ids?.length ? toIntIds(filters.ids) : null;
      const merged = idFilter
        ? idFilter.filter((id) => allowed.includes(id))
        : allowed;
      where.id = { in: merged.length ? merged : [-1] };
    }
  }

  try {
    const [rows, total] = await Promise.all([
      prisma.project.findMany({
        where: where as never,
        orderBy: { name: "asc" },
        skip,
        take: perPage,
        include: projectListInclude,
      }),
      prisma.project.count({ where: where as never }),
    ]);

    const areaNamesMap = await loadAreaNamesByProjectIds(rows.map((p) => p.id));

    const items = rows.map((p, index) => ({
      rowNum: skip + index + 1,
      id: p.id,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      name: p.name,
      address: p.address,
      areaNames:
        areaNamesMap.get(p.id) ?? p.location?.name ?? "",
      progressName: p.progress?.name ?? p.progressLabel ?? "—",
      status: p.status,
      statusLabel: PROJECT_STATUS_LABELS[p.status] ?? String(p.status),
      addedBy: p.owners[0]?.builder?.fullName ?? "—",
      slug: p.slug,
    }));

    return { items, total };
  } catch (e) {
    return { items: [], total: 0, error: String(e) };
  }
}

export async function getAdminProjectDetail(id: number) {
  if (!isDatabaseEnabled()) return { project: null, error: "Database disabled" };
  if (!Number.isFinite(id) || id <= 0) {
    return { project: null, error: "Invalid project ID" };
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        progress: true,
        projectType: true,
        location: true,
        owners: { include: { builder: true } },
        units: { where: { isArchive: false }, orderBy: { id: "asc" } },
        projectAmenities: { include: { amenity: true } },
        projectUtilities: { include: { utility: true } },
        projectTags: { include: { tag: true } },
      },
    });
    if (!project) return { project: null, error: "Not found" };

    const areaIds = await loadAreaIdsForProject(id);
    const areaNamesMap = await loadAreaNamesByProjectIds([id]);

    type ExtraRow = {
      meta_tags: string | null;
      marketed_by: string | null;
      added_time: Date | null;
    };
    const extrasRows = await queryRaw<ExtraRow[]>(
      `SELECT meta_tags, marketed_by, added_time FROM projects WHERE id = ? LIMIT 1`,
      id
    );
    const extras = extrasRows[0];

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
    const infoRows = await queryRaw<InfoRow[]>(
      `SELECT main_heading, sub_heading, bullet_1, bullet_2, bullet_3, bullet_4, bullet_5, bullet_6
       FROM project_infos WHERE project_id = ? LIMIT 1`,
      id
    );
    const info = infoRows[0];
    const projectInfo = info
      ? {
          mainHeading: info.main_heading,
          subHeading: info.sub_heading,
          bullet1: info.bullet_1,
          bullet2: info.bullet_2,
          bullet3: info.bullet_3,
          bullet4: info.bullet_4,
          bullet5: info.bullet_5,
          bullet6: info.bullet_6,
        }
      : null;

    return {
      project: toJsonSafe({
        ...project,
        areaIds,
        areaNames: areaNamesMap.get(id) ?? project.location?.name ?? "",
        ownerIds: project.owners.map((o) => o.builderId),
        tagIds: project.projectTags.map((t) => t.tagId),
        amenityIds: project.projectAmenities.map((a) => a.amenityId),
        utilityIds: project.projectUtilities.map((u) => u.utilityId),
        statusLabel: PROJECT_STATUS_LABELS[project.status] ?? String(project.status),
        projectInfo,
        metaTags: extras?.meta_tags ?? "",
        marketedBy: extras?.marketed_by ?? "",
        addedTime: extras?.added_time
          ? new Date(extras.added_time).toISOString()
          : "",
      }),
    };
  } catch (e) {
    return { project: null, error: String(e) };
  }
}

export function mapProjectFormToWriteData(body: Record<string, unknown>) {
  const areaIdsRaw = body.areaIds;
  let areaIds: string[] = [];
  if (Array.isArray(areaIdsRaw)) {
    areaIds = areaIdsRaw.map(String);
  } else if (typeof areaIdsRaw === "string" && areaIdsRaw) {
    areaIds = areaIdsRaw.split(",").filter(Boolean);
  }

  return {
    name: body.name != null ? String(body.name) : undefined,
    slug: body.slug != null ? String(body.slug) : undefined,
    address: body.address != null ? String(body.address) : undefined,
    details: body.details != null ? String(body.details) : undefined,
    status: body.status != null ? Number(body.status) : undefined,
    tier:
      body.tier !== undefined
        ? (String(body.tier).trim() || null)
        : undefined,
    projectTypeId:
      body.projectTypeId != null && body.projectTypeId !== ""
        ? Number(body.projectTypeId)
        : undefined,
    progressStatusId:
      body.progressStatusId != null && body.progressStatusId !== ""
        ? Number(body.progressStatusId)
        : undefined,
    latitude: body.latitude != null && body.latitude !== "" ? Number(body.latitude) : undefined,
    longitude:
      body.longitude != null && body.longitude !== "" ? Number(body.longitude) : undefined,
    minPrice: body.minPrice != null && body.minPrice !== "" ? Number(body.minPrice) : undefined,
    discountPrice:
      body.discountPrice != null && body.discountPrice !== ""
        ? Number(body.discountPrice)
        : undefined,
    installmentLength:
      body.installmentLength != null && body.installmentLength !== ""
        ? Number(body.installmentLength)
        : undefined,
    metaTitle: body.metaTitle != null ? String(body.metaTitle) : undefined,
    metaDescription: body.metaDescription != null ? String(body.metaDescription) : undefined,
    projectVideo: body.projectVideo != null ? String(body.projectVideo) : undefined,
    rooms: body.rooms != null ? String(body.rooms) : undefined,
    metaTags: body.metaTags != null ? String(body.metaTags) : undefined,
    marketedBy: body.marketedBy !== undefined && body.marketedBy !== null
      ? String(body.marketedBy).trim() || null
      : undefined,
    addedTime: body.addedTime != null && body.addedTime !== "" ? String(body.addedTime) : undefined,
    addedTimeZone:
      body.addedTimeZone != null && body.addedTimeZone !== ""
        ? String(body.addedTimeZone)
        : undefined,
    areaIds,
    primaryAreaId: areaIds[0],
    ownerIds: Array.isArray(body.ownerIds)
      ? body.ownerIds.map((x) => Number(x)).filter((n) => Number.isFinite(n))
      : [],
    tagIds: Array.isArray(body.tagIds)
      ? body.tagIds.map((x) => Number(x)).filter((n) => Number.isFinite(n))
      : [],
    amenityIds: Array.isArray(body.amenityIds)
      ? body.amenityIds.map((x) => Number(x)).filter((n) => Number.isFinite(n))
      : [],
    utilityIds: Array.isArray(body.utilityIds)
      ? body.utilityIds.map((x) => Number(x)).filter((n) => Number.isFinite(n))
      : [],
    mainHeading: body.mainHeading != null ? String(body.mainHeading) : undefined,
    subHeading: body.subHeading != null ? String(body.subHeading) : undefined,
    bullet1: body.bullet1 != null ? String(body.bullet1) : undefined,
    bullet2: body.bullet2 != null ? String(body.bullet2) : undefined,
    bullet3: body.bullet3 != null ? String(body.bullet3) : undefined,
    bullet4: body.bullet4 != null ? String(body.bullet4) : undefined,
    bullet5: body.bullet5 != null ? String(body.bullet5) : undefined,
    bullet6: body.bullet6 != null ? String(body.bullet6) : undefined,
  };
}

async function syncProjectOwners(projectId: number, ownerIds: number[]) {
  await prisma.projectOwner.deleteMany({ where: { projectId } });
  if (!ownerIds.length) return;
  await prisma.projectOwner.createMany({
    data: ownerIds.map((builderId) => ({ projectId, builderId })),
  });
}

async function syncProjectTags(projectId: number, tagIds: number[]) {
  await prisma.projectTag.deleteMany({ where: { projectId } });
  if (!tagIds.length) return;
  await prisma.projectTag.createMany({
    data: tagIds.map((tagId) => ({ projectId, tagId })),
  });
}

async function syncProjectAmenities(projectId: number, amenityIds: number[]) {
  await prisma.projectAmenity.deleteMany({ where: { projectId } });
  if (!amenityIds.length) return;
  await prisma.projectAmenity.createMany({
    data: amenityIds.map((amenityId) => ({ projectId, amenityId, isActive: true })),
  });
}

async function syncProjectUtilities(projectId: number, utilityIds: number[]) {
  await prisma.projectUtility.deleteMany({ where: { projectId } });
  if (!utilityIds.length) return;
  await prisma.projectUtility.createMany({
    data: utilityIds.map((utilityId) => ({ projectId, utilityId })),
  });
}

async function upsertProjectInfo(projectId: number, mapped: ReturnType<typeof mapProjectFormToWriteData>) {
  await executeRaw(
    `INSERT INTO project_infos (project_id, main_heading, sub_heading, bullet_1, bullet_2, bullet_3, bullet_4, bullet_5, bullet_6, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
     ON DUPLICATE KEY UPDATE main_heading=VALUES(main_heading), sub_heading=VALUES(sub_heading),
     bullet_1=VALUES(bullet_1), bullet_2=VALUES(bullet_2), bullet_3=VALUES(bullet_3),
     bullet_4=VALUES(bullet_4), bullet_5=VALUES(bullet_5), bullet_6=VALUES(bullet_6), updated_at=NOW()`,
    projectId,
    mapped.mainHeading ?? "",
    mapped.subHeading ?? "",
    mapped.bullet1 ?? "",
    mapped.bullet2 ?? "",
    mapped.bullet3 ?? "",
    mapped.bullet4 ?? "",
    mapped.bullet5 ?? "",
    mapped.bullet6 ?? ""
  );
}

async function resolveBuilderRecordId(userId: number): Promise<number | null> {
  return resolveBuilderIdForUser(userId);
}

export async function setProjectApprovalStatus(
  projectId: number,
  action: ProjectApprovalAction
): Promise<{ success: boolean; error?: string }> {
  if (!isDatabaseEnabled()) return { success: false, error: "Database disabled" };
  const status = PROJECT_STATUS_BY_APPROVAL[action];
  try {
    await prisma.project.update({
      where: { id: projectId, isArchive: false },
      data: { status },
    });

    // Resolve project name + builder owners to notify
    const projRows = await queryRaw<{ name: string }[]>(
      `SELECT name FROM projects WHERE id = ?`,
      projectId
    );
    const projectName = projRows[0]?.name ?? "your project";
    const owners = await prisma.projectOwner.findMany({
      where: { projectId },
      include: { builder: { select: { id: true, fullName: true } } },
    });

    const statusLabel = PROJECT_STATUS_LABELS[status] ?? action;
    for (const owner of owners) {
      if (owner.builder) {
        createNotification({
          recipientType: "builder",
          recipientId: owner.builder.id,
          type: "project_reviewed",
          title: `Project ${statusLabel}`,
          message: `Your project "${projectName}" is now ${statusLabel}.`,
          link: "/admin/projects",
        }).catch(() => {});
      }
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function saveAdminProject(
  id: number | null,
  body: Record<string, unknown>,
  session?: AdminSession | null
): Promise<{ project: { id: number } | null; error?: string }> {
  if (!isDatabaseEnabled()) return { project: null, error: "Database disabled" };

  const mapped = mapProjectFormToWriteData(body);
  const builderSession = session && isBuilderSession(session);

  if (builderSession) {
    mapped.status = undefined;
    const builderId = await resolveBuilderRecordId(session.id);
    if (!builderId) {
      return { project: null, error: BUILDER_PROFILE_MISSING };
    }
    mapped.ownerIds = [builderId];
    if (id == null) {
      mapped.status = 2;
    }
  }

  let progressLabel: string | undefined;
  if (mapped.progressStatusId != null) {
    const prog = await prisma.progress.findUnique({ where: { id: mapped.progressStatusId } });
    progressLabel = prog?.name;
  }

  const data: Record<string, unknown> = {
    ...(mapped.name != null ? { name: mapped.name } : {}),
    ...(mapped.address != null ? { address: mapped.address } : {}),
    ...(mapped.tier !== undefined ? { tier: mapped.tier } : {}),
    ...(mapped.details != null ? { details: mapped.details } : {}),
    ...(mapped.status != null ? { status: mapped.status } : {}),
    ...(mapped.projectTypeId != null ? { projectTypeId: mapped.projectTypeId } : {}),
    ...(mapped.progressStatusId != null ? { progressStatusId: mapped.progressStatusId } : {}),
    ...(mapped.latitude != null ? { latitude: mapped.latitude } : {}),
    ...(mapped.longitude != null ? { longitude: mapped.longitude } : {}),
    ...(mapped.minPrice != null ? { minPrice: mapped.minPrice } : {}),
    ...(mapped.discountPrice != null ? { discountPrice: mapped.discountPrice } : {}),
    ...(mapped.installmentLength != null ? { installmentLength: mapped.installmentLength } : {}),
    ...(mapped.metaTitle != null ? { metaTitle: mapped.metaTitle } : {}),
    ...(mapped.metaDescription != null ? { metaDescription: mapped.metaDescription } : {}),
    ...(mapped.projectVideo != null ? { projectVideo: mapped.projectVideo } : {}),
    ...(mapped.rooms != null ? { rooms: mapped.rooms } : {}),
    ...(progressLabel != null ? { progressLabel } : {}),
    ...(mapped.primaryAreaId
      ? { areaId: BigInt(mapped.primaryAreaId) }
      : {}),
  };

  try {
    let projectId = id;
    if (projectId == null) {
      const slugBase = mapped.slug || mapped.name || `project-${Date.now()}`;
      const created = await prisma.project.create({
        data: {
          name: String(mapped.name ?? "New project"),
          slug: await uniqueProjectSlug(String(slugBase)),
          status: mapped.status ?? 2,
          propertyId: randomBytes(2).toString("hex"),
          ...data,
        } as never,
      });
      projectId = created.id;
    } else {
      if (mapped.slug != null) {
        data.slug = await uniqueProjectSlug(String(mapped.slug), projectId);
      }
      if (builderSession) {
        const existing = await prisma.project.findUnique({
          where: { id: projectId },
          select: { status: true },
        });
        if (existing?.status === 1) {
          data.status = 2;
        }
      }
      await prisma.project.update({ where: { id: projectId }, data: data as never });
    }

    if (
      mapped.metaTags != null ||
      body.marketedBy !== undefined ||
      mapped.addedTime != null
    ) {
      await executeRaw(
        `UPDATE projects SET
          meta_tags = COALESCE(?, meta_tags),
          marketed_by = ?,
          added_time = COALESCE(?, added_time)
         WHERE id = ?`,
        mapped.metaTags ?? null,
        mapped.marketedBy ?? null,
        mapped.addedTime
          ? parseDatetimeLocalInTimeZone(
              mapped.addedTime,
              mapped.addedTimeZone ?? DEFAULT_ADMIN_TIMEZONE
            )
          : null,
        projectId
      );
    }

    await upsertProjectInfo(projectId, mapped);
    await syncProjectOwners(projectId, mapped.ownerIds);
    await syncProjectTags(projectId, mapped.tagIds);
    await syncProjectAmenities(projectId, mapped.amenityIds);
    await syncProjectUtilities(projectId, mapped.utilityIds);

    if (mapped.areaIds.length) {
      try {
        await prisma.projectArea.deleteMany({ where: { projectId } });
        await prisma.projectArea.createMany({
          data: mapped.areaIds.map((areaId) => ({
            projectId,
            areaId: BigInt(areaId),
          })),
        });
      } catch {
        await executeRaw(
          `DELETE FROM project_area WHERE project_id = ?`,
          projectId
        );
        for (const areaId of mapped.areaIds) {
          await executeRaw(
            `INSERT INTO project_area (project_id, area_id, is_archive) VALUES (?, ?, 0)`,
            projectId,
            Number(areaId)
          );
        }
      }
    }

    // Notify admins when a builder submits a project for review
    if (builderSession && projectId) {
      const projRows = await queryRaw<{ name: string }[]>(
        `SELECT name FROM projects WHERE id = ?`,
        projectId
      );
      const builderRows = await queryRaw<{ full_name: string }[]>(
        `SELECT full_name FROM builders WHERE user_id = ?`,
        session!.id
      );
      createNotification({
        recipientType: ADMIN_BROADCAST.type,
        recipientId: ADMIN_BROADCAST.id,
        type: "project_submitted",
        title: "New project submitted",
        message: `${builderRows[0]?.full_name ?? "A builder"} submitted "${projRows[0]?.name ?? "a project"}" for review.`,
        link: "/admin/projects/pending",
      }).catch(() => {});
    }

    return { project: { id: projectId! } };
  } catch (e) {
    return { project: null, error: String(e) };
  }
}

export async function archiveAdminProject(id: number) {
  await prisma.project.update({ where: { id }, data: { isArchive: true } });
}

export async function notifyProjectUsers(
  projectId: number,
  userIds: number[],
  session: AdminSession
): Promise<{ count: number; error?: string }> {
  if (!isDatabaseEnabled()) return { count: 0, error: "Database disabled" };
  if (!userIds.length) return { count: 0, error: "No users selected" };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, slug: true },
  });
  if (!project) return { count: 0, error: "Not found" };

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, userTypeId: true },
  });

  await Promise.all(
    users.map(async (u) => {
      const recipient = await resolveRecipientForUser(u.id, u.userTypeId);
      await createNotification({
        recipientType: recipient.type,
        recipientId: recipient.id,
        actorType: "admin",
        actorId: session.id,
        type: "project",
        title: `Project: ${project.name}`,
        message: `Check out the details for "${project.name}".`,
        link: `/project/${project.slug}`,
      });
    })
  );

  return { count: users.length };
}
