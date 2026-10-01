import { cache } from "react";
import { executeRaw, queryRaw } from "@/lib/prisma-raw";
import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { tableExists } from "@/lib/db-table-exists";
import { jsonNum } from "@/lib/prisma-json";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 180);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base) || "team";
  let n = 0;
  while (true) {
    const candidate = n ? `${slug}-${n}` : slug;
    const rows = await queryRaw<{ id: number }[]>(
      `SELECT id FROM teams WHERE slug = ? LIMIT 1`,
      candidate
    );
    if (!rows.length) return candidate;
    n++;
  }
}

export const resolveBuilderContext = cache(async function resolveBuilderContext(userId: number) {
  const rows = await queryRaw<{ id: number; full_name: string }[]>(
    `SELECT id, full_name FROM builders WHERE user_id = ? AND is_archive = 0 LIMIT 1`,
    userId
  );
  return rows[0]
    ? { builderId: jsonNum(rows[0].id), builderName: rows[0].full_name }
    : null;
});

/** Legacy stores team_lead_id as user id or builder id depending on entry */
function leadIdClause(userId: number, builderId: number | null): string {
  if (builderId != null) {
    return `(t.team_lead_id = ? OR t.team_lead_id = ?)`;
  }
  return `t.team_lead_id = ?`;
}

function leadIdParams(userId: number, builderId: number | null): unknown[] {
  if (builderId != null) return [userId, builderId];
  return [userId];
}

/** Resolve display name for `team_lead_id` (may be builder id or user id). */
export async function resolveTeamLeadName(leadId: number): Promise<string | null> {
  if (!leadId) return null;

  const byBuilderId = await queryRaw<{ full_name: string }[]>(
    `SELECT full_name FROM builders WHERE id = ? AND is_archive = 0 LIMIT 1`,
    leadId
  );
  if (byBuilderId[0]?.full_name) return byBuilderId[0].full_name;

  const byUserId = await queryRaw<{ full_name: string }[]>(
    `SELECT full_name FROM builders WHERE user_id = ? AND is_archive = 0 LIMIT 1`,
    leadId
  );
  if (byUserId[0]?.full_name) return byUserId[0].full_name;

  const user = await prisma.user.findUnique({
    where: { id: leadId },
    select: { firstName: true, lastName: true, email: true },
  });
  if (!user) return null;
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || null
  );
}

async function teamIdBySlug(slug: string): Promise<number | null> {
  const teams = await queryRaw<{ id: number }[]>(`SELECT id FROM teams WHERE slug = ?`, slug);
  const id = teams[0]?.id;
  return id != null ? jsonNum(id) : null;
}

/** Project IDs assigned to teams the user leads or belongs to. */
export async function loadTeamProjectIdsForUser(userId: number): Promise<number[]> {
  if (!isDatabaseEnabled()) return [];
  const ctx = await resolveBuilderContext(userId);
  const builderId = ctx?.builderId ?? null;

  const rows = await queryRaw<{ project_id: number }[]>(
    `SELECT DISTINCT tp.project_id
     FROM team_projects tp
     INNER JOIN teams t ON t.id = tp.team_id
     WHERE (${leadIdClause(userId, builderId)})
        OR EXISTS (
          SELECT 1 FROM team_users tu
          WHERE tu.team_id = t.id AND tu.user_id = ? AND tu.status = 1
        )
        ${builderId != null ? `OR EXISTS (
          SELECT 1 FROM team_builders tb
          WHERE tb.team_id = t.id AND tb.builder_id = ? AND tb.status = 1
        )` : ""}`,
    ...leadIdParams(userId, builderId),
    userId,
    ...(builderId != null ? [builderId] : [])
  );
  return rows.map((r) => jsonNum(r.project_id));
}

/** Project IDs from teams the user joined (member/builder), excluding teams they lead. */
export async function loadJoinedTeamProjectIdsForUser(userId: number): Promise<number[]> {
  if (!isDatabaseEnabled()) return [];
  const ctx = await resolveBuilderContext(userId);
  const builderId = ctx?.builderId ?? null;

  const rows = await queryRaw<{ project_id: number }[]>(
    `SELECT DISTINCT tp.project_id
     FROM team_projects tp
     INNER JOIN teams t ON t.id = tp.team_id
     WHERE NOT (${leadIdClause(userId, builderId)})
       AND (
         EXISTS (
           SELECT 1 FROM team_users tu
           WHERE tu.team_id = t.id AND tu.user_id = ? AND tu.status = 1
         )
         ${builderId != null ? `OR EXISTS (
           SELECT 1 FROM team_builders tb
           WHERE tb.team_id = t.id AND tb.builder_id = ? AND tb.status = 1
         )` : ""}
       )`,
    ...leadIdParams(userId, builderId),
    userId,
    ...(builderId != null ? [builderId] : [])
  );
  return rows.map((r) => jsonNum(r.project_id));
}

export async function userIsJoinedTeamMemberOnly(userId: number): Promise<boolean> {
  const [myTeams, joinedTeams] = await Promise.all([
    listMyTeams(userId),
    listJoinedTeams(userId),
  ]);
  return !myTeams.items.length && joinedTeams.items.length > 0;
}

/** `null` = no restriction; `number[]` = team member may only see these projects. */
export const getTeamMemberProjectScope = cache(async function getTeamMemberProjectScope(
  userId: number
): Promise<number[] | null> {
  if (!isDatabaseEnabled()) return null;
  if (!(await userIsJoinedTeamMemberOnly(userId))) return null;
  return loadJoinedTeamProjectIdsForUser(userId);
});

export async function canUserViewTeamScopedProject(
  userId: number,
  projectId: number
): Promise<boolean> {
  const scope = await getTeamMemberProjectScope(userId);
  if (scope === null) return true;
  return scope.includes(projectId);
}

export async function userCanManageTeamBySlug(userId: number, slug: string): Promise<boolean> {
  if (!isDatabaseEnabled()) return false;
  const ctx = await resolveBuilderContext(userId);
  const builderId = ctx?.builderId ?? null;
  const rows = await queryRaw<{ id: number }[]>(
    `SELECT id FROM teams t WHERE slug = ? AND ${leadIdClause(userId, builderId)}`,
    slug,
    ...leadIdParams(userId, builderId)
  );
  return rows.length > 0;
}

export async function userCanViewTeamBySlug(userId: number, slug: string): Promise<boolean> {
  if (!isDatabaseEnabled()) return false;
  if (await userCanManageTeamBySlug(userId, slug)) return true;

  const teamId = await teamIdBySlug(slug);
  if (!teamId) return false;

  const ctx = await resolveBuilderContext(userId);
  const builderId = ctx?.builderId ?? null;

  const memberRows = await queryRaw<{ id: number }[]>(
    `SELECT 1 AS id FROM team_users WHERE team_id = ? AND user_id = ? AND status = 1 LIMIT 1`,
    teamId,
    userId
  );
  if (memberRows.length) return true;

  if (builderId != null) {
    const builderRows = await queryRaw<{ id: number }[]>(
      `SELECT 1 AS id FROM team_builders WHERE team_id = ? AND builder_id = ? AND status = 1 LIMIT 1`,
      teamId,
      builderId
    );
    if (builderRows.length) return true;
  }

  return false;
}

/** Builders may only assign projects they own; staff may assign any. */
export async function filterTeamProjectIds(
  userId: number,
  isStaff: boolean,
  projectIds: number[]
): Promise<number[]> {
  if (isStaff) return projectIds;
  const ctx = await resolveBuilderContext(userId);
  if (!ctx?.builderId) return [];

  const owned = await queryRaw<{ project_id: number }[]>(
    `SELECT project_id FROM project_owners WHERE builder_id = ?`,
    ctx.builderId
  );
  const allowed = new Set(owned.map((r) => jsonNum(r.project_id)));
  return projectIds.filter((id) => allowed.has(id));
}

export async function listMyTeams(userId: number) {
  if (!isDatabaseEnabled()) return { items: [], error: "Database disabled" };
  const ctx = await resolveBuilderContext(userId);
  const builderId = ctx?.builderId ?? null;
  const where = leadIdClause(userId, builderId);

  try {
    const rows = await queryRaw<
      {
        id: number;
        name: string;
        slug: string;
        description: string | null;
        team_lead_id: number;
        created_at: Date | null;
      }[]
    >(
      `SELECT t.id, t.name, t.slug, t.description, t.team_lead_id, t.created_at
       FROM teams t WHERE ${where}
       ORDER BY t.id DESC`,
      ...leadIdParams(userId, builderId)
    );

    const items = await Promise.all(
      rows.map(async (r, i) => ({
        rowNum: i + 1,
        id: jsonNum(r.id),
        name: r.name,
        slug: r.slug,
        description: r.description,
        teamLeadName: await resolveTeamLeadName(jsonNum(r.team_lead_id)),
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
      }))
    );

    return { items };
  } catch (e) {
    return { items: [], error: String(e) };
  }
}

export async function listJoinedTeams(userId: number) {
  if (!isDatabaseEnabled()) return { items: [], error: "Database disabled" };
  const ctx = await resolveBuilderContext(userId);
  const builderId = ctx?.builderId ?? null;

  try {
    const parts: string[] = [];
    const params: unknown[] = [];

    parts.push(
      `SELECT DISTINCT t.id, t.name, t.slug, t.description, t.team_lead_id, t.created_at
       FROM teams t
       INNER JOIN team_users tu ON tu.team_id = t.id AND tu.user_id = ?`
    );
    params.push(userId);

    if (builderId != null) {
      parts.push(
        `UNION
         SELECT DISTINCT t.id, t.name, t.slug, t.description, t.team_lead_id, t.created_at
         FROM teams t
         INNER JOIN team_builders tb ON tb.team_id = t.id AND tb.builder_id = ?`
      );
      params.push(builderId);
    }

    const sql = `${parts.join(" ")} ORDER BY id DESC`;
    const rows = await queryRaw<
      {
        id: number;
        name: string;
        slug: string;
        description: string | null;
        team_lead_id: number;
        created_at: Date | null;
      }[]
    >(sql, ...params);

    const items = await Promise.all(
      rows.map(async (r, i) => ({
        rowNum: i + 1,
        id: jsonNum(r.id),
        name: r.name,
        slug: r.slug,
        description: r.description,
        teamLeadName: await resolveTeamLeadName(jsonNum(r.team_lead_id)),
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
      }))
    );

    return { items };
  } catch (e) {
    return { items: [], error: String(e) };
  }
}

export async function listAllTeams() {
  if (!isDatabaseEnabled()) return { items: [], error: "Database disabled" };
  try {
    const rows = await queryRaw<
      {
        id: number;
        name: string;
        slug: string;
        description: string | null;
        team_lead_id: number | null;
      }[]
    >(`SELECT id, name, slug, description, team_lead_id FROM teams ORDER BY id DESC`);

    const items = await Promise.all(
      rows.map(async (r, i) => ({
        rowNum: i + 1,
        id: jsonNum(r.id),
        name: r.name,
        slug: r.slug,
        description: r.description,
        teamLeadId: r.team_lead_id != null ? jsonNum(r.team_lead_id) : null,
        teamLeadName:
          r.team_lead_id != null ? await resolveTeamLeadName(jsonNum(r.team_lead_id)) : null,
      }))
    );

    return { items };
  } catch (e) {
    return { items: [], error: String(e) };
  }
}

export async function loadTeamCreateMeta(userId: number, isStaff: boolean) {
  const users = await prisma.user.findMany({
    where: { isArchive: false },
    orderBy: { firstName: "asc" },
    select: { id: true, firstName: true, lastName: true, email: true },
    take: 500,
  });

  let projectSql = `SELECT p.id, p.name FROM projects p WHERE p.is_archive = 0 ORDER BY p.name`;
  const projectParams: unknown[] = [];

  if (!isStaff) {
    const ctx = await resolveBuilderContext(userId);
    if (ctx?.builderId) {
      projectSql = `SELECT DISTINCT p.id, p.name
        FROM projects p
        INNER JOIN project_owners po ON po.project_id = p.id
        WHERE po.builder_id = ? AND p.is_archive = 0
        ORDER BY p.name`;
      projectParams.push(ctx.builderId);
    } else {
      projectSql = `SELECT id, name FROM projects WHERE 1=0`;
    }
  }

  const projects = await queryRaw<{ id: number; name: string }[]>(
    projectSql,
    ...projectParams
  );

  const builders = await queryRaw<{ id: number; full_name: string }[]>(
    `SELECT id, full_name FROM builders WHERE is_archive = 0 ORDER BY full_name LIMIT 500`
  );

  return {
    users: users.map((u) => ({
      value: String(u.id),
      label: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || `User #${u.id}`,
    })),
    builders: isStaff
      ? builders.map((b) => ({
          value: String(jsonNum(b.id)),
          label: b.full_name,
        }))
      : [],
    projects: projects.map((p) => ({
      value: String(jsonNum(p.id)),
      label: p.name,
    })),
    isStaff,
  };
}

export async function getTeamBySlug(slug: string) {
  if (!isDatabaseEnabled()) return { team: null, error: "Database disabled" };

  const teams = await queryRaw<
    { id: number; name: string; slug: string; description: string | null; team_lead_id: number | null }[]
  >(`SELECT id, name, slug, description, team_lead_id FROM teams WHERE slug = ?`, slug);
  const t = teams[0];
  if (!t) return { team: null, error: "Not found" };

  const teamId = jsonNum(t.id);

  const members = await queryRaw<
    { user_id: number; status: number; first_name: string | null; last_name: string | null; email: string | null }[]
  >(
    `SELECT tu.user_id, tu.status, u.first_name, u.last_name, u.email
     FROM team_users tu INNER JOIN users u ON u.id = tu.user_id
     WHERE tu.team_id = ?`,
    teamId
  );

  const builders = await queryRaw<
    { builder_id: number; status: number; full_name: string }[]
  >(
    `SELECT tb.builder_id, tb.status, b.full_name
     FROM team_builders tb INNER JOIN builders b ON b.id = tb.builder_id
     WHERE tb.team_id = ?`,
    teamId
  );

  const projects = await queryRaw<{ project_id: number; name: string }[]>(
    `SELECT tp.project_id, p.name FROM team_projects tp
     INNER JOIN projects p ON p.id = tp.project_id
     WHERE tp.team_id = ?`,
    teamId
  );

  const projectRows: {
    id: number;
    name: string;
    owners: string[];
    staffUsers: string[];
  }[] = [];

  for (const p of projects) {
    const pid = jsonNum(p.project_id);
    const owners = await queryRaw<{ full_name: string }[]>(
      `SELECT b.full_name FROM project_owners po
       INNER JOIN builders b ON b.id = po.builder_id
       WHERE po.project_id = ?`,
      pid
    );
    let staffUsers: { name: string | null }[] = [];
    if (await tableExists("project_users")) {
      staffUsers = await queryRaw<{ name: string | null }[]>(
        `SELECT a.name FROM project_users pu
         LEFT JOIN admins a ON a.id = pu.admin_id
         WHERE pu.project_id = ?`,
        pid
      );
    }
    projectRows.push({
      id: pid,
      name: p.name,
      owners: owners.map((o) => o.full_name),
      staffUsers: staffUsers.map((u) => u.name ?? "—").filter(Boolean),
    });
  }

  const teamLeadName =
    t.team_lead_id != null ? await resolveTeamLeadName(jsonNum(t.team_lead_id)) : null;

  return {
    team: {
      id: teamId,
      name: t.name,
      slug: t.slug,
      description: t.description,
      teamLeadId: t.team_lead_id != null ? jsonNum(t.team_lead_id) : null,
      teamLeadName,
      members: members.map((m) => ({
        id: jsonNum(m.user_id),
        status: jsonNum(m.status),
        name: [m.first_name, m.last_name].filter(Boolean).join(" ") || m.email || "—",
      })),
      builders: builders.map((b) => ({
        id: jsonNum(b.builder_id),
        status: jsonNum(b.status),
        name: b.full_name,
      })),
      projects: projectRows,
    },
  };
}

export async function createTeam(
  userId: number,
  input: {
    name: string;
    description: string;
    memberIds: number[];
    builderIds?: number[];
    projectIds: number[];
  },
  options?: { isStaff?: boolean }
) {
  if (!isDatabaseEnabled()) return { success: false, message: "Database disabled" };
  const name = input.name.trim();
  const description = input.description.trim();
  if (!name || !description) {
    return { success: false, message: "Name and description are required" };
  }
  if (!input.memberIds.length) {
    return { success: false, message: "Select at least one member" };
  }
  if (!input.projectIds.length) {
    return { success: false, message: "Select at least one project" };
  }

  const isStaff = options?.isStaff ?? false;
  const projectIds = await filterTeamProjectIds(userId, isStaff, input.projectIds);
  if (!projectIds.length) {
    return { success: false, message: "Select at least one project you own" };
  }
  const builderIds = isStaff ? (input.builderIds ?? []) : [];

  const ctx = await resolveBuilderContext(userId);
  const leadId = ctx?.builderId ?? userId;
  const slug = await uniqueSlug(name);

  try {
    await executeRaw(
      `INSERT INTO teams (name, slug, team_lead_id, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())`,
      name,
      slug,
      leadId,
      description
    );
    const inserted = await queryRaw<{ id: number }[]>(
      `SELECT id FROM teams WHERE slug = ?`,
      slug
    );
    const teamId = jsonNum(inserted[0]?.id);
    if (!teamId) return { success: false, message: "Failed to create team" };

    for (const uid of input.memberIds) {
      await executeRaw(
        `INSERT INTO team_users (team_id, user_id, status, created_at, updated_at)
         VALUES (?, ?, 1, NOW(), NOW())`,
        teamId,
        uid
      );
    }
    for (const pid of projectIds) {
      await executeRaw(
        `INSERT INTO team_projects (team_id, project_id) VALUES (?, ?)`,
        teamId,
        pid
      );
    }
    for (const bid of builderIds) {
      await executeRaw(
        `INSERT INTO team_builders (team_id, builder_id, status, created_at, updated_at)
         VALUES (?, ?, 1, NOW(), NOW())`,
        teamId,
        bid
      );
    }

    return { success: true, slug, id: teamId };
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

export async function updateTeamAssignments(
  slug: string,
  input: {
    name?: string;
    description?: string;
    memberIds?: number[];
    builderIds?: number[];
    projectIds?: number[];
  },
  options?: { userId?: number; isStaff?: boolean }
) {
  if (!isDatabaseEnabled()) return { success: false, message: "Database disabled" };
  const teams = await queryRaw<{ id: number }[]>(
    `SELECT id FROM teams WHERE slug = ?`,
    slug
  );
  const teamId = jsonNum(teams[0]?.id);
  if (!teamId) return { success: false, message: "Team not found" };

  const isStaff = options?.isStaff ?? false;
  if (!isStaff && options?.userId != null) {
    const canManage = await userCanManageTeamBySlug(options.userId, slug);
    if (!canManage) return { success: false, message: "Forbidden" };
  }

  if (input.name?.trim() || input.description?.trim()) {
    await executeRaw(
      `UPDATE teams SET name = COALESCE(?, name), description = COALESCE(?, description), updated_at = NOW() WHERE id = ?`,
      input.name?.trim() || null,
      input.description?.trim() || null,
      teamId
    );
  }

  if (input.memberIds) {
    await executeRaw(`DELETE FROM team_users WHERE team_id = ?`, teamId);
    for (const uid of input.memberIds) {
      await executeRaw(
        `INSERT INTO team_users (team_id, user_id, status, created_at, updated_at)
         VALUES (?, ?, 1, NOW(), NOW())`,
        teamId,
        uid
      );
    }
  }

  if (input.builderIds && isStaff) {
    await executeRaw(`DELETE FROM team_builders WHERE team_id = ?`, teamId);
    for (const bid of input.builderIds) {
      await executeRaw(
        `INSERT INTO team_builders (team_id, builder_id, status, created_at, updated_at)
         VALUES (?, ?, 1, NOW(), NOW())`,
        teamId,
        bid
      );
    }
  }

  if (input.projectIds) {
    const projectIds = await filterTeamProjectIds(
      options?.userId ?? 0,
      isStaff,
      input.projectIds
    );
    if (!isStaff && !projectIds.length) {
      return { success: false, message: "Select at least one project you own" };
    }
    await executeRaw(`DELETE FROM team_projects WHERE team_id = ?`, teamId);
    for (const pid of projectIds) {
      await executeRaw(
        `INSERT INTO team_projects (team_id, project_id) VALUES (?, ?)`,
        teamId,
        pid
      );
    }
  }

  return { success: true, message: "Team updated" };
}

export async function deleteTeam(id: number) {
  await executeRaw(`DELETE FROM team_users WHERE team_id = ?`, id);
  await executeRaw(`DELETE FROM team_builders WHERE team_id = ?`, id);
  await executeRaw(`DELETE FROM team_projects WHERE team_id = ?`, id);
  await executeRaw(`DELETE FROM teams WHERE id = ?`, id);
}
