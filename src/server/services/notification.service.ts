import { prisma } from "@/lib/prisma";
import { queryRaw, executeRaw } from "@/lib/prisma-raw";
import { isDatabaseEnabled } from "@/lib/db";
import { emitNotification, type NotificationPayload } from "@/server/notifications/bus";

export type NotificationRow = {
  id: number;
  recipientType: string;
  recipientId: number;
  actorType: string | null;
  actorId: number | null;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

async function notificationsTableExists(): Promise<boolean> {
  if (!isDatabaseEnabled()) return false;
  try {
    const rows = await queryRaw<{ cnt: number }[]>(
      `SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'notifications'`
    );
    return Number(rows[0]?.cnt ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function createNotification(input: {
  recipientType: string;
  recipientId: number;
  actorType?: string | null;
  actorId?: number | null;
  type: string;
  title: string;
  message: string;
  link?: string | null;
}): Promise<void> {
  if (!isDatabaseEnabled()) {
    console.warn("[createNotification] skipped: database not enabled");
    return;
  }
  if (!(await notificationsTableExists())) {
    console.warn("[createNotification] skipped: notifications table missing");
    return;
  }

  const rows = await queryRaw<{ id: number; created_at: Date }[]>(
    `INSERT INTO notifications (recipient_type, recipient_id, actor_type, actor_id, type, title, message, link, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(3))`,
    input.recipientType,
    input.recipientId,
    input.actorType ?? null,
    input.actorId ?? null,
    input.type,
    input.title,
    input.message,
    input.link ?? null
  );

  const now = new Date().toISOString();
  const payload: NotificationPayload = {
    id: Number(rows[0]?.id ?? 0),
    recipientType: input.recipientType,
    recipientId: input.recipientId,
    actorType: input.actorType,
    actorId: input.actorId,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link,
    isRead: false,
    createdAt: now,
  };

  emitNotification(payload);
}

export async function listNotifications(
  recipientType: string,
  recipientId: number,
  opts?: { limit?: number; unreadOnly?: boolean }
): Promise<NotificationRow[]> {
  if (!isDatabaseEnabled()) return [];
  if (!(await notificationsTableExists())) return [];

  const conditions = ["recipient_type = ?"];
  const params: unknown[] = [recipientType];

  // Admin always sees broadcast (id=0) notifications regardless of their own id
  if (recipientType === "admin") {
    conditions.push("recipient_id = 0");
  } else {
    conditions.push("recipient_id = ?");
    params.push(recipientId);
  }

  if (opts?.unreadOnly) {
    conditions.push("is_read = 0");
  }

  const limit = Math.min(opts?.limit ?? 50, 100);
  const rows = await queryRaw<NotificationRow[]>(
    `SELECT id, recipient_type AS recipientType, recipient_id AS recipientId,
            actor_type AS actorType, actor_id AS actorId, type, title, message, link,
            is_read AS isRead, created_at AS createdAt
     FROM notifications
     WHERE ${conditions.join(" AND ")}
     ORDER BY created_at DESC
     LIMIT ${limit}`,
    ...params
  );

  return rows.map((r) => {
    const parsed = new Date(r.createdAt);
    return {
      ...r,
      id: Number(r.id),
      recipientId: Number(r.recipientId),
      actorId: r.actorId != null ? Number(r.actorId) : null,
      isRead: Boolean(r.isRead),
      createdAt: Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString(),
    };
  });
}

export async function countUnreadNotifications(
  recipientType: string,
  recipientId: number
): Promise<number> {
  if (!isDatabaseEnabled()) return 0;
  if (!(await notificationsTableExists())) return 0;

  const conditions = ["recipient_type = ?", "is_read = 0"];
  const params: unknown[] = [recipientType];

  if (recipientType === "admin") {
    conditions.push("recipient_id = 0");
  } else {
    conditions.push("recipient_id = ?");
    params.push(recipientId);
  }

  const rows = await queryRaw<{ cnt: number }[]>(
    `SELECT COUNT(*) AS cnt FROM notifications WHERE ${conditions.join(" AND ")}`,
    ...params
  );

  return Number(rows[0]?.cnt ?? 0);
}

export async function markNotificationsRead(
  recipientType: string,
  recipientId: number,
  opts?: { id?: number; all?: boolean }
): Promise<void> {
  if (!isDatabaseEnabled()) return;
  if (!(await notificationsTableExists())) return;

  const conditions = ["recipient_type = ?"];
  const params: unknown[] = [recipientType];

  if (recipientType === "admin") {
    conditions.push("recipient_id = 0");
  } else {
    conditions.push("recipient_id = ?");
    params.push(recipientId);
  }

  if (opts?.id) {
    conditions.push("id = ?");
    params.push(opts.id);
  }

  if (!opts?.all && !opts?.id) return;

  await executeRaw(
    `UPDATE notifications SET is_read = 1, updated_at = NOW(3) WHERE ${conditions.join(" AND ")}`,
    ...params
  );
}
