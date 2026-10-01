import { isDatabaseEnabled } from "@/lib/db";
import { prisma } from "@/lib/prisma";

export type CustomActivityLogInput = {
  logName?: string;
  description: string;
  conversionId?: number;
  objective?: string;
  subjectType?: string;
  subjectId?: number;
  logTable?: string;
  pageUrl?: string;
  durationInSecond?: number;
  properties?: Record<string, unknown>;
  userId?: number | null;
  ip?: string | null;
};

/** Legacy: POST /create/custom-activity-log */
export async function createCustomActivityLog(
  input: CustomActivityLogInput
): Promise<{ success: boolean; id?: string }> {
  if (!isDatabaseEnabled()) {
    return { success: false };
  }

  let conversionLabel: string | null = null;
  if (input.conversionId) {
    const conv = await prisma.activityLogConversion.findUnique({
      where: { id: input.conversionId },
    });
    conversionLabel = conv?.description ?? null;
  }

  const row = await prisma.activityLog.create({
    data: {
      logName: input.logName ?? "default",
      description: input.description,
      conversionId: input.conversionId ?? null,
      conversion: conversionLabel,
      objective: input.objective ?? null,
      subjectType: input.subjectType ?? null,
      subjectId: input.subjectId != null ? BigInt(input.subjectId) : null,
      logTable: input.logTable ?? "projects",
      pageUrl: input.pageUrl ?? null,
      durationInSecond: input.durationInSecond != null ? BigInt(input.durationInSecond) : null,
      causerType: input.userId ? "App\\Models\\User" : null,
      causerId: input.userId ?? null,
      ip: input.ip ?? null,
      properties: input.properties ? JSON.stringify(input.properties) : null,
      createdDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return { success: true, id: row.id.toString() };
}

export type GuestActivityEventInput = {
  objective: string;
  description: string;
  subjectType?: string | null;
  subjectId?: number | null;
  logTable?: string | null;
  pageUrl?: string | null;
  durationInSecond?: number | null;
  properties?: Record<string, unknown> | null;
  createdAt?: string | null;
};

export const ACTIVITY_LOG_SYNC_MAX = 100;

/** Merge sessionStorage guest activity events into the DB after login — same pattern as
 * search-history.service.ts's syncGuestHistory, one bulk insert, capped and attributed to
 * the now-known userId. */
export async function syncGuestActivityLog(
  userId: number,
  events: GuestActivityEventInput[]
): Promise<{ success: boolean; added: number }> {
  if (!isDatabaseEnabled()) return { success: false, added: 0 };

  const items = events.filter((e) => e && typeof e.objective === "string").slice(-ACTIVITY_LOG_SYNC_MAX);
  if (!items.length) return { success: true, added: 0 };

  const now = new Date();
  await prisma.activityLog.createMany({
    data: items.map((e) => ({
      logName: "default",
      description: e.description,
      objective: e.objective,
      subjectType: e.subjectType ?? null,
      subjectId: e.subjectId != null ? BigInt(e.subjectId) : null,
      logTable: e.logTable ?? "projects",
      pageUrl: e.pageUrl ?? null,
      durationInSecond: e.durationInSecond != null ? BigInt(e.durationInSecond) : null,
      causerType: "App\\Models\\User",
      causerId: userId,
      properties: e.properties ? JSON.stringify(e.properties) : null,
      createdDate: e.createdAt ? new Date(e.createdAt) : now,
      createdAt: e.createdAt ? new Date(e.createdAt) : now,
      updatedAt: now,
    })),
  });

  return { success: true, added: items.length };
}
