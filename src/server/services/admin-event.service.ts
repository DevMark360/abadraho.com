import { prisma } from "@/lib/prisma";
import { isDatabaseEnabled } from "@/lib/db";
import { isBuilderSession, isFullStaff } from "@/lib/admin-rbac";
import { resolveBuilderIdForUser, builderOwnsProject } from "@/lib/admin-builder-ownership";
import {
  EVENT_STATUS_PENDING,
  isEventStatus,
  isEventType,
  type EventStatus,
} from "@/lib/event-status";
import { slugify } from "@/lib/slugify";
import type { AdminSession } from "@/lib/admin-session-cookie";
import { createNotification } from "@/server/services/notification.service";
import { resolveRecipientForUser } from "@/lib/notifications/recipient";

export type AdminEventListQuery = {
  page: number;
  perPage: number;
  status?: string;
  projectId?: number;
};

export function parseEventListQuery(params: URLSearchParams): AdminEventListQuery {
  const status = params.get("status") ?? undefined;
  const projectIdRaw = params.get("projectId");
  return {
    page: Math.max(1, Number(params.get("page") ?? 1) || 1),
    perPage: Math.min(100, Math.max(1, Number(params.get("perPage") ?? 25) || 25)),
    status: status && isEventStatus(status) ? status : undefined,
    projectId: projectIdRaw ? Number(projectIdRaw) || undefined : undefined,
  };
}

/**
 * All fields optional — a key that's absent means "leave the stored value
 * alone" (e.g. a status-only moderation PATCH), distinct from an explicit
 * empty value. Only meaningful on edit; on create, absent fields fall back
 * to "" / null and normal validation applies.
 */
export type AdminEventInput = {
  title?: string;
  eventType?: string;
  description?: string | null;
  venue?: string | null;
  startDate?: string;
  endDate?: string | null;
  coverImage?: string | null;
  projectId?: number | null;
  builderId?: number | null;
  status?: string;
};

async function uniqueEventSlug(base: string, excludeId?: number): Promise<string> {
  const root = slugify(base) || "event";
  let n = 0;
  while (true) {
    const candidate = n ? `${root}-${n}` : root;
    const existing = await prisma.event.findFirst({
      where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
    if (!existing) return candidate;
    n++;
  }
}

export async function listAdminEvents(query: AdminEventListQuery, session: AdminSession) {
  if (!isDatabaseEnabled()) return { items: [], total: 0, error: "Database disabled" };

  const where: Record<string, unknown> = { isArchive: false };

  if (isBuilderSession(session)) {
    const builderId = await resolveBuilderIdForUser(session.id);
    if (!builderId) return { items: [], total: 0 };
    where.builderId = builderId;
  }

  if (query.status) where.status = query.status;
  if (query.projectId) where.projectId = query.projectId;

  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
      include: {
        builder: { select: { id: true, fullName: true } },
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.event.count({ where }),
  ]);

  return { items, total };
}

export async function getAdminEventDetail(id: number, session: AdminSession) {
  if (!isDatabaseEnabled()) return { event: null, error: "Database disabled" };

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      builder: { select: { id: true, fullName: true } },
      project: { select: { id: true, name: true } },
    },
  });
  if (!event) return { event: null, error: "Not found" };

  if (isBuilderSession(session)) {
    const builderId = await resolveBuilderIdForUser(session.id);
    if (event.builderId !== builderId) return { event: null, error: "Forbidden" };
  }

  return { event };
}

export async function saveAdminEvent(
  id: number | null,
  body: AdminEventInput,
  session: AdminSession
) {
  if (!isDatabaseEnabled()) return { error: "Database disabled" };

  let existing: Awaited<ReturnType<typeof prisma.event.findUnique>> = null;
  if (id != null) {
    existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) return { error: "Not found" };
  }

  // A key absent from `body` (undefined) falls back to the existing stored
  // value, so a partial PATCH (e.g. a status-only moderation update) can't
  // wipe out the rest of the event.
  const title = (body.title !== undefined ? body.title : (existing?.title ?? "")).trim();
  if (!title) return { error: "Title is required" };

  const eventType = body.eventType !== undefined ? String(body.eventType) : (existing?.eventType ?? "");
  if (!isEventType(eventType)) return { error: "A valid event type is required" };

  const startDateRaw = body.startDate !== undefined ? body.startDate : existing?.startDate.toISOString();
  const startDate = new Date(startDateRaw ?? "");
  if (Number.isNaN(startDate.getTime())) return { error: "A valid start date is required" };

  const endDateRaw =
    body.endDate !== undefined ? body.endDate : (existing?.endDate?.toISOString() ?? null);
  const endDate = endDateRaw ? new Date(endDateRaw) : null;
  if (endDate && Number.isNaN(endDate.getTime())) return { error: "End date is invalid" };

  const description =
    body.description !== undefined ? body.description?.trim() || null : (existing?.description ?? null);
  const venue = body.venue !== undefined ? body.venue?.trim() || null : (existing?.venue ?? null);

  const projectId =
    body.projectId !== undefined
      ? body.projectId
        ? Number(body.projectId)
        : null
      : (existing?.projectId ?? null);

  let builderId: number;
  let status: EventStatus | undefined;

  if (isBuilderSession(session)) {
    const resolved = await resolveBuilderIdForUser(session.id);
    if (!resolved) {
      return { error: "Builder profile missing — contact admin to link your account." };
    }
    if (existing && existing.builderId !== resolved) {
      return { error: "Forbidden" };
    }
    builderId = resolved;
    // Builders can never set/change status — new events always start pending.
    status = id == null ? EVENT_STATUS_PENDING : undefined;

    if (projectId != null) {
      const owns = await builderOwnsProject(session, projectId);
      if (!owns) return { error: "You do not have access to this project" };
    }
  } else if (isFullStaff(session)) {
    builderId = body.builderId ? Number(body.builderId) : (existing?.builderId ?? 0);
    if (!builderId) return { error: "Builder is required" };
    if (body.status && isEventStatus(body.status)) status = body.status;
  } else {
    return { error: "Forbidden" };
  }

  const slug = await uniqueEventSlug(title, existing?.id);

  const data = {
    title,
    slug,
    eventType,
    description,
    venue,
    startDate,
    endDate,
    builderId,
    projectId,
    ...(status !== undefined ? { status } : {}),
    // undefined = leave the stored cover image untouched (no new file uploaded)
    ...(body.coverImage !== undefined ? { coverImage: body.coverImage || null } : {}),
  };

  if (id == null) {
    const created = await prisma.event.create({
      data: { ...data, status: status ?? EVENT_STATUS_PENDING },
    });
    return { event: created };
  }

  const updated = await prisma.event.update({ where: { id }, data });
  return { event: updated };
}

export async function notifyEventUsers(
  eventId: number,
  userIds: number[],
  session: AdminSession
): Promise<{ count: number; error?: string }> {
  if (!isDatabaseEnabled()) return { count: 0, error: "Database disabled" };
  if (!userIds.length) return { count: 0, error: "No users selected" };

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, slug: true, startDate: true, venue: true },
  });
  if (!event) return { count: 0, error: "Not found" };

  const message = [
    event.venue,
    event.startDate.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
  ]
    .filter(Boolean)
    .join(" · ");

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
        type: "event",
        title: `New event: ${event.title}`,
        message: message || "Check out the details.",
        link: `/events/${event.slug}`,
      });
    })
  );

  return { count: users.length };
}

export async function archiveAdminEvent(id: number, session: AdminSession) {
  const existing = await prisma.event.findUnique({
    where: { id },
    select: { id: true, builderId: true },
  });
  if (!existing) throw new Error("Not found");

  if (isBuilderSession(session)) {
    const builderId = await resolveBuilderIdForUser(session.id);
    if (existing.builderId !== builderId) throw new Error("Forbidden");
  }

  await prisma.event.update({ where: { id }, data: { isArchive: true } });
}
