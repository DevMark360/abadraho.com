import { apiFetch } from "@/lib/client/api-fetch";

const STORAGE_KEY = "guest_history";
const DEBOUNCE_MS = 500;

export type GuestHistoryEntry = {
  project_id: number | null;
  area: string | null;
  min_price: number | null;
  max_price: number | null;
  created_at: string;
};

export type TrackActivityInput = {
  projectId?: number | null;
  area?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
};

let pending: TrackActivityInput[] = [];
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let flushLoggedIn: boolean | null = null;

let syncPromise: Promise<void> | null = null;
let guestSynced = false;

function activityKey(input: TrackActivityInput): string {
  return [
    input.projectId ?? "",
    input.area ?? "",
    input.minPrice ?? "",
    input.maxPrice ?? "",
  ].join("|");
}

function isEmpty(input: TrackActivityInput): boolean {
  return (
    input.projectId == null &&
    !input.area &&
    input.minPrice == null &&
    input.maxPrice == null
  );
}

function readGuestHistory(): GuestHistoryEntry[] {
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

function writeGuestHistory(entries: GuestHistoryEntry[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function toGuestEntry(input: TrackActivityInput): GuestHistoryEntry {
  return {
    project_id: input.projectId ?? null,
    area: input.area ?? null,
    min_price: input.minPrice ?? null,
    max_price: input.maxPrice ?? null,
    created_at: new Date().toISOString(),
  };
}

function flushGuestPending() {
  if (!pending.length) return;

  const history = readGuestHistory();
  const seen = new Set<string>();

  for (const input of pending) {
    if (isEmpty(input)) continue;
    const key = activityKey(input);
    if (seen.has(key)) continue;
    seen.add(key);
    history.push(toGuestEntry(input));
  }

  writeGuestHistory(history);
  pending = [];
}

async function flushLoggedInPending() {
  if (!pending.length) return;

  const batch = [...pending];
  pending = [];

  const payload = batch.map((input) => ({
    project_id: input.projectId ?? null,
    area: input.area ?? null,
    min_price: input.minPrice ?? null,
    max_price: input.maxPrice ?? null,
    created_at: new Date().toISOString(),
  }));

  try {
    if (payload.length === 1) {
      await apiFetch("/api/v1/search-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload[0]),
        keepalive: true,
      });
    } else {
      await apiFetch("/api/v1/search-history/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: payload }),
        keepalive: true,
      });
    }
  } catch {
    /* offline — re-queue for next debounce */
    pending.unshift(...batch);
  }
}

function scheduleFlush(isLoggedIn: boolean) {
  flushLoggedIn = isLoggedIn;
  if (debounceTimer != null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const loggedIn = flushLoggedIn === true;
    if (loggedIn) {
      void flushLoggedInPending();
    } else {
      flushGuestPending();
    }
  }, DEBOUNCE_MS);
}

export function pushGuestActivity(input: TrackActivityInput) {
  if (isEmpty(input)) return;
  pending.push(input);
  scheduleFlush(false);
}

export async function trackUserActivity(
  input: TrackActivityInput,
  isLoggedIn: boolean
): Promise<void> {
  if (isEmpty(input)) return;

  pending.push(input);
  scheduleFlush(isLoggedIn);
}

export async function syncGuestHistoryToServer(): Promise<void> {
  if (guestSynced) return;
  if (syncPromise) return syncPromise;

  if (debounceTimer != null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
    flushGuestPending();
  }

  const history = readGuestHistory();
  if (!history.length) {
    guestSynced = true;
    return;
  }

  syncPromise = (async () => {
    try {
      const res = await apiFetch("/api/v1/search-history/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history }),
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

export function resetSearchHistorySyncState() {
  guestSynced = false;
  syncPromise = null;
  pending = [];
  if (debounceTimer != null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

export function trackFilterSearch(
  draft: Record<string, string>,
  areaOptions: { value: string; label: string }[],
  isLoggedIn: boolean
) {
  const areaIds = draft.area?.split(",").filter(Boolean) ?? [];
  const areaLabels = areaIds
    .map((id) => areaOptions.find((a) => a.value === id)?.label)
    .filter((x): x is string => Boolean(x));

  const area = areaLabels.length ? areaLabels.join(", ") : null;
  const minPrice = draft.minPrice ? Number(draft.minPrice) : null;
  const maxPrice = draft.maxPrice ? Number(draft.maxPrice) : null;

  void trackUserActivity(
    {
      area,
      minPrice: Number.isFinite(minPrice!) ? minPrice : null,
      maxPrice: Number.isFinite(maxPrice!) ? maxPrice : null,
    },
    isLoggedIn
  );
}
