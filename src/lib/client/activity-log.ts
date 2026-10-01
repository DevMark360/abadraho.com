import { apiFetch } from "@/lib/client/api-fetch";

/** Fire-and-forget client events — legacy CallLaravelAction("/create/custom-activity-log") */

export function logClientActivity(
  userId: number | null | undefined,
  payload: {
    description: string;
    log_name?: string;
    conversion_id?: number;
    objective?: string;
    subject_id?: number;
    subject_type?: string;
    log_table?: string;
    page_url?: string;
    duration_in_second?: number;
    [key: string]: unknown;
  }
) {
  if (typeof window === "undefined" || !userId) return;

  const body = {
    ...payload,
    page_url: payload.page_url ?? window.location.pathname,
  };

  void apiFetch("/api/v1/activity-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => undefined);
}

/**
 * Guest-aware activity tracking — while logged out, events buffer in sessionStorage (same
 * pattern as search-history-track.ts) instead of being dropped; syncActivityLogToServer()
 * flushes the buffer in one bulk insert once the visitor logs in, so section views / time-on-
 * page / actions taken before login aren't lost.
 */
const STORAGE_KEY = "guest_activity_log";

export type ActivityEvent = {
  objective: string;
  description: string;
  subjectType?: string | null;
  subjectId?: number | null;
  logTable?: string | null;
  pageUrl?: string | null;
  durationInSecond?: number | null;
  properties?: Record<string, unknown> | null;
};

type BufferedActivityEvent = ActivityEvent & { createdAt: string };

let syncPromise: Promise<void> | null = null;
let guestSynced = false;

function readBuffer(): BufferedActivityEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBuffer(events: BufferedActivityEvent[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function sendNow(event: ActivityEvent) {
  void apiFetch("/api/v1/activity-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      description: event.description,
      objective: event.objective,
      subject_type: event.subjectType,
      subject_id: event.subjectId,
      log_table: event.logTable,
      page_url: event.pageUrl ?? window.location.pathname,
      duration_in_second: event.durationInSecond,
      properties: event.properties,
    }),
    keepalive: true,
  }).catch(() => undefined);
}

/** Call for every tracked event — buffers while logged out, sends immediately once logged in. */
export function trackActivity(event: ActivityEvent, isLoggedIn: boolean) {
  if (typeof window === "undefined") return;

  if (isLoggedIn) {
    sendNow(event);
    return;
  }

  const buffer = readBuffer();
  buffer.push({ ...event, createdAt: new Date().toISOString() });
  writeBuffer(buffer);
}

/** Flush the guest buffer into the DB right after login — mirrors syncGuestHistoryToServer(). */
export async function syncActivityLogToServer(): Promise<void> {
  if (guestSynced) return;
  if (syncPromise) return syncPromise;

  const buffer = readBuffer();
  if (!buffer.length) {
    guestSynced = true;
    return;
  }

  syncPromise = (async () => {
    try {
      const res = await apiFetch("/api/v1/activity-log/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: buffer }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        sessionStorage.removeItem(STORAGE_KEY);
        guestSynced = true;
      }
    } catch {
      /* retry on next login */
    } finally {
      syncPromise = null;
    }
  })();

  return syncPromise;
}

export function resetActivityLogSyncState() {
  guestSynced = false;
  syncPromise = null;
}
