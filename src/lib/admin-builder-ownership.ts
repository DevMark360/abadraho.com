import { NextResponse } from "next/server";
import type { AdminSession } from "@/lib/admin-session-cookie";
import { isBuilderSession, isFullStaff } from "@/lib/admin-rbac";
import { isDatabaseEnabled } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { jsonNum } from "@/lib/prisma-json";
import { userTypeIds } from "@/config/site";

export const BUILDER_PROFILE_MISSING =
  "Builder profile missing. Contact admin to link your account.";

/** undefined = unrestricted (full staff); [] = scoped but no projects. */
export async function resolveSessionProjectScope(
  session: AdminSession
): Promise<number[] | undefined> {
  const { getTeamMemberProjectScope } = await import("@/server/services/admin-team.service");
  const teamScope = await getTeamMemberProjectScope(session.id);
  if (teamScope !== null) {
    return teamScope;
  }

  if (isBuilderSession(session)) {
    return loadBuilderAccessibleProjectIds(session.id);
  }

  if (isFullStaff(session)) {
    return undefined;
  }

  return undefined;
}

/** Builder-scoped project IDs for API filtering; undefined = full staff (no scope). */
export async function getBuilderScopeProjectIds(
  session: AdminSession
): Promise<number[] | undefined> {
  return resolveSessionProjectScope(session);
}

/** For list/export filters — undefined means no project filter (full staff). */
export async function builderProjectIdsForSession(
  session: AdminSession
): Promise<number[] | undefined> {
  return resolveSessionProjectScope(session);
}

/** Apply builder project scope to raw SQL conditions (empty scope → no rows). */
export function applyBuilderProjectSql(
  conditions: string[],
  params: unknown[],
  column: string,
  builderProjectIds: number[] | undefined
): void {
  if (builderProjectIds === undefined) return;
  if (!builderProjectIds.length) {
    conditions.push("1=0");
    return;
  }
  conditions.push(`${column} IN (${builderProjectIds.map(() => "?").join(",")})`);
  params.push(...builderProjectIds);
}

/** Intersect user-selected project ids with builder-owned ids. */
export function intersectBuilderProjectIds(
  builderProjectIds: number[] | undefined,
  requestedIds?: number[]
): number[] | undefined {
  if (builderProjectIds === undefined) return requestedIds;
  if (!builderProjectIds.length) return [];
  if (!requestedIds?.length) return builderProjectIds;
  return requestedIds.filter((id) => builderProjectIds.includes(id));
}

/** Prisma `where` for projects dropdown/list — null = staff (all). */
export function scopedProjectsWhere(builderProjectIds: number[] | null) {
  if (builderProjectIds === null) return { isArchive: false };
  return {
    isArchive: false,
    id: { in: builderProjectIds.length ? builderProjectIds : [-1] },
  };
}

/** Prisma `where` for units dropdown/list — null = staff (all). */
export function scopedUnitsWhere(builderProjectIds: number[] | null) {
  if (builderProjectIds === null) return { isArchive: false };
  return {
    isArchive: false,
    projectId: { in: builderProjectIds.length ? builderProjectIds : [-1] },
  };
}

/**
 * Resolve `builders.id` for a builder user — link by email or create row when missing.
 * Mirrors broker portal `resolveBrokerForAgentUser`.
 */
export async function resolveBuilderIdForUser(userId: number): Promise<number | null> {
  if (!isDatabaseEnabled()) return null;

  const linked = await prisma.builder.findFirst({
    where: { userId, isArchive: false },
    select: { id: true },
  });
  if (linked) return linked.id;

  const user = await prisma.user.findFirst({
    where: { id: userId, isArchive: false, userTypeId: userTypeIds.builder },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
    },
  });
  if (!user) return null;

  const email = user.email?.trim().toLowerCase();
  if (email) {
    const byEmail = await prisma.builder.findFirst({
      where: { isArchive: false, email: { equals: email } },
      select: { id: true },
    });
    if (byEmail) {
      await prisma.builder.update({
        where: { id: byEmail.id },
        data: { userId: user.id },
      });
      return byEmail.id;
    }
  }

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || user.firstName;

  try {
    const created = await prisma.builder.create({
      data: {
        fullName,
        userId: user.id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        isArchive: false,
      },
      select: { id: true },
    });
    return created.id;
  } catch {
    const retry = await prisma.builder.findFirst({
      where: { userId, isArchive: false },
      select: { id: true },
    });
    return retry?.id ?? null;
  }
}

/** Project IDs owned by the builder linked to this user session. */
export async function loadBuilderProjectIds(userId: number): Promise<number[]> {
  const rows = await prisma.$queryRaw<{ project_id: number }[]>`
    SELECT po.project_id
    FROM project_owners po
    INNER JOIN builders b ON b.id = po.builder_id
    WHERE b.user_id = ${userId} AND b.is_archive = 0
  `;
  return rows.map((r) => jsonNum(r.project_id));
}

/** Owned projects plus team-assigned projects for builder sessions. */
export async function loadBuilderAccessibleProjectIds(userId: number): Promise<number[]> {
  const { loadTeamProjectIdsForUser } = await import("@/server/services/admin-team.service");
  const [owned, team] = await Promise.all([
    loadBuilderProjectIds(userId),
    loadTeamProjectIdsForUser(userId),
  ]);
  return [...new Set([...owned, ...team])];
}

export async function builderOwnsProject(
  session: AdminSession,
  projectId: number
): Promise<boolean> {
  if (!Number.isFinite(projectId) || projectId <= 0) return false;
  const scope = await resolveSessionProjectScope(session);
  if (scope === undefined) return true;
  return scope.includes(projectId);
}

export async function requireBuilderProjectAccess(
  session: AdminSession,
  projectId: number
): Promise<true | NextResponse> {
  if (!(await builderOwnsProject(session, projectId))) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  return true;
}

export async function resolveUnitProjectId(unitId: number): Promise<number | null> {
  if (!Number.isFinite(unitId) || unitId <= 0) return null;
  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { projectId: true },
  });
  return unit?.projectId ?? null;
}

export async function requireBuilderUnitAccess(
  session: AdminSession,
  unitId: number
): Promise<true | NextResponse> {
  const projectId = await resolveUnitProjectId(unitId);
  if (!projectId) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }
  return requireBuilderProjectAccess(session, projectId);
}

export async function requireBuilderReviewAccess(
  session: AdminSession,
  reviewId: number
): Promise<true | NextResponse> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { projectId: true },
  });
  if (!review) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }
  return requireBuilderProjectAccess(session, review.projectId);
}

export async function requireBuilderEventAccess(
  session: AdminSession,
  eventId: number
): Promise<true | NextResponse> {
  if (!isBuilderSession(session)) return true;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { builderId: true },
  });
  if (!event) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }
  const builderId = await resolveBuilderIdForUser(session.id);
  if (event.builderId !== builderId) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  return true;
}

export async function requireBuilderInquiryAccess(
  session: AdminSession,
  inquiryId: number
): Promise<true | NextResponse> {
  const inquiry = await prisma.inquiry.findUnique({
    where: { id: inquiryId },
    select: { projectId: true },
  });
  if (!inquiry?.projectId) {
    return NextResponse.json(
      { success: false, message: inquiry ? "Forbidden" : "Not found" },
      { status: inquiry ? 403 : 404 }
    );
  }
  return requireBuilderProjectAccess(session, inquiry.projectId);
}
