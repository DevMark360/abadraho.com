import { apiFetch } from "@/lib/client/api-fetch";
import {
  type CompareEntry,
  getCompareList,
  isInCompare,
  replaceCompareList,
} from "@/lib/client/compare-store";

let serverEntries: CompareEntry[] | null = null;
let serverLoaded = false;

function mapServerEntry(e: {
  projectId: number;
  slug: string;
  unitId?: number | null;
}): CompareEntry {
  return {
    id: e.projectId,
    slug: e.slug,
    unitId: e.unitId ?? null,
  };
}

export async function loadServerCompareEntries(): Promise<CompareEntry[]> {
  try {
    const res = await fetch("/api/v1/compare/entries");
    if (!res.ok) {
      serverLoaded = true;
      serverEntries = [];
      return [];
    }
    const json = await res.json();
    const entries = (json.entries ?? []).map(mapServerEntry);
    serverEntries = entries;
    serverLoaded = true;
    if (entries.length) {
      replaceCompareList(entries);
    }
    window.dispatchEvent(new Event("abadraho-compare"));
    return entries;
  } catch {
    serverLoaded = true;
    serverEntries = [];
    return [];
  }
}

export async function syncLocalCompareToServer(): Promise<boolean> {
  const local = getCompareList();
  if (!local.length) return true;
  try {
    const res = await apiFetch("/api/v1/compare/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entries: local.map((e) => ({
          projectId: e.id,
          unitId: e.unitId,
        })),
      }),
    });
    if (!res.ok) return false;
    await loadServerCompareEntries();
    return true;
  } catch {
    return false;
  }
}

export async function pushCompareToServer(): Promise<void> {
  const local = getCompareList();
  try {
    const me = await fetch("/api/v1/auth/me");
    const json = await me.json();
    if (!json.user) return;

    const res = await apiFetch("/api/v1/compare", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entries: local.map((e) => ({
          projectId: e.id,
          unitId: e.unitId,
        })),
      }),
    });
    if (res.ok) {
      const json = await res.json();
      serverEntries = (json.entries ?? []).map(mapServerEntry);
    }
  } catch {
    /* offline */
  }
}

export function isInCompareSynced(projectId: number): boolean {
  if (serverEntries?.some((e) => e.id === projectId)) return true;
  return isInCompare(projectId);
}

export function resetCompareSyncCache() {
  serverEntries = null;
  serverLoaded = false;
}

export function isCompareServerLoaded() {
  return serverLoaded;
}

/** Load projects from ?ids= into compare list (guests + logged-in). */
export async function hydrateCompareFromUrlIds(ids: number[]): Promise<CompareEntry[]> {
  const unique = [...new Set(ids.filter((id) => Number.isFinite(id) && id > 0))].slice(0, 2);
  if (!unique.length) return getCompareList();

  try {
    const res = await fetch("/api/v1/projects/compare", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: unique }),
    });
    if (!res.ok) return getCompareList();
    const json = await res.json();
    const data = (json.data ?? []) as Array<{ id: number; slug: string }>;
    const entries: CompareEntry[] = [];
    for (const id of unique) {
      const p = data.find((x) => x.id === id);
      if (p) entries.push({ id: p.id, slug: p.slug, unitId: null });
    }

    if (entries.length) {
      replaceCompareList(entries);
      await pushCompareToServer();
    }
    return entries;
  } catch {
    return getCompareList();
  }
}

export function buildCompareShareUrl(): string {
  const ids = getCompareList()
    .map((e) => e.id)
    .join(",");
  if (typeof window === "undefined") {
    return `/compare?ids=${ids}`;
  }
  return `${window.location.origin}/compare?ids=${ids}`;
}
