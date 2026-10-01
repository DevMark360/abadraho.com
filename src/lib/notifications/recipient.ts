import { getAdminSession } from "@/lib/admin-session";
import { getSession } from "@/lib/session";
import { resolveBuilderIdForUser } from "@/lib/admin-builder-ownership";
import { roleFromUserTypeId } from "@/lib/roles";
import { queryRaw } from "@/lib/prisma-raw";

export type NotificationRecipient = {
  type: "admin" | "broker" | "builder" | "user";
  id: number;
  userId?: number;
};

/** Broadcast to all admin/staff users. */
export const ADMIN_BROADCAST: NotificationRecipient = { type: "admin", id: 0 };

/**
 * Resolve a known user (id + userTypeId) into a notification recipient —
 * broker/builder accounts are keyed by their own table's id, not users.id,
 * so any caller writing a notification for a `users` row must go through
 * this (not assume recipientType:"user").
 */
export async function resolveRecipientForUser(
  userId: number,
  userTypeId: number | null | undefined
): Promise<NotificationRecipient> {
  const role = roleFromUserTypeId(userTypeId);

  if (role === "broker") {
    const rows = await queryRaw<{ id: number }[]>(
      `SELECT id FROM brokers WHERE user_id = ? AND is_archive = 0 LIMIT 1`,
      userId
    );
    if (rows[0]) {
      return { type: "broker", id: Number(rows[0].id), userId };
    }
  }

  if (role === "builder") {
    const builderId = await resolveBuilderIdForUser(userId);
    if (builderId) {
      return { type: "builder", id: builderId, userId };
    }
  }

  return { type: "user", id: userId };
}

/**
 * Resolve the current session into a notification recipient.
 * Tries admin → broker → builder → plain user, in that order.
 */
export async function resolveNotificationRecipient(): Promise<NotificationRecipient | null> {
  try {
    // 1. Admin / staff / builder-as-admin session
    const admin = await getAdminSession();
    if (admin) {
      return { type: "admin", id: admin.id };
    }

    // 2. Broker/builder/plain website-user session
    const session = await getSession();
    if (!session?.id) return null;

    return resolveRecipientForUser(session.id, session.userTypeId);
  } catch (e) {
    console.error("[resolveNotificationRecipient] error:", e);
    return null;
  }
}

/**
 * Build a notification key used for DB queries and SSE subscription.
 */
export function notificationKey(r: NotificationRecipient): { type: string; id: number } {
  return { type: r.type, id: r.id };
}
