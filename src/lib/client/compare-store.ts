const KEY = "abadraho_compare";
export const MAX_COMPARE = 2;

/** Stable empty snapshot for SSR + useSyncExternalStore */
export const EMPTY_COMPARE_LIST: CompareEntry[] = [];

export interface CompareEntry {
  id: number;
  slug: string;
  /** Selected unit for plan-wise comparison */
  unitId?: number | null;
}

let cachedRaw = "";
let cachedSnapshot: CompareEntry[] = EMPTY_COMPARE_LIST;

function readFromStorage(): CompareEntry[] {
  if (typeof window === "undefined") return EMPTY_COMPARE_LIST;
  try {
    const raw = localStorage.getItem(KEY) ?? "[]";
    if (raw === cachedRaw) return cachedSnapshot;
    cachedRaw = raw;
    const parsed = JSON.parse(raw) as CompareEntry[];
    const next = parsed.slice(0, MAX_COMPARE);
    cachedSnapshot = next.length > 0 ? next : EMPTY_COMPARE_LIST;
    return cachedSnapshot;
  } catch {
    cachedRaw = "[]";
    cachedSnapshot = EMPTY_COMPARE_LIST;
    return EMPTY_COMPARE_LIST;
  }
}

function persist(next: CompareEntry[]) {
  const sliced = next.slice(0, MAX_COMPARE);
  cachedRaw = JSON.stringify(sliced);
  cachedSnapshot = sliced.length > 0 ? sliced : EMPTY_COMPARE_LIST;
  localStorage.setItem(KEY, cachedRaw);
  window.dispatchEvent(new Event("abadraho-compare"));
}

export function getCompareList(): CompareEntry[] {
  return readFromStorage();
}

/** Stable string snapshot for useSyncExternalStore */
export function getCompareSnapshotKey(): string {
  return readFromStorage()
    .map((e) => `${e.id}:${e.slug}:${e.unitId ?? ""}`)
    .join("|");
}

export function getCompareIds(): number[] {
  return getCompareList().map((e) => e.id);
}

export function isInCompare(id: number): boolean {
  return getCompareList().some((e) => e.id === id);
}

export function canAddToCompare(id: number): boolean {
  const list = getCompareList();
  if (list.some((e) => e.id === id)) return true;
  return list.length < MAX_COMPARE;
}

export type ToggleCompareResult = {
  list: CompareEntry[];
  added: boolean;
  removed: boolean;
  rejected?: boolean;
};

export function toggleCompare(id: number, slug: string): ToggleCompareResult {
  const list = getCompareList();
  const idx = list.findIndex((e) => e.id === id);
  if (idx >= 0) {
    const next = list.filter((e) => e.id !== id);
    persist(next);
    return { list: next, added: false, removed: true };
  }
  if (list.length >= MAX_COMPARE) {
    return { list, added: false, removed: false, rejected: true };
  }
  const next = [...list, { id, slug, unitId: null }];
  persist(next);
  return { list: next, added: true, removed: false };
}

/** Replace entire compare list (e.g. from server or URL). */
export function replaceCompareList(entries: CompareEntry[]) {
  const next = entries.slice(0, MAX_COMPARE).map((e) => ({
    id: e.id,
    slug: e.slug,
    unitId: e.unitId ?? null,
  }));
  persist(next);
  return next;
}

/** Swap one project for another when the list is full. */
export function swapCompareProject(
  replaceProjectId: number,
  newEntry: CompareEntry
): ToggleCompareResult {
  const list = getCompareList();
  const idx = list.findIndex((e) => e.id === replaceProjectId);
  if (idx < 0) {
    return { list, added: false, removed: false, rejected: true };
  }
  const next = [...list];
  next[idx] = {
    id: newEntry.id,
    slug: newEntry.slug,
    unitId: newEntry.unitId ?? null,
  };
  persist(next);
  return { list: next, added: true, removed: false };
}

export function setCompareUnit(projectId: number, unitId: number | null) {
  const list = getCompareList();
  const idx = list.findIndex((e) => e.id === projectId);
  if (idx < 0) return list;
  const next = [...list];
  next[idx] = { ...next[idx], unitId };
  persist(next);
  return next;
}

/** Add project + pre-selected unit (from PDP units tab). */
export function addCompareWithUnit(
  projectId: number,
  slug: string,
  unitId: number
): ToggleCompareResult {
  const list = getCompareList();
  const idx = list.findIndex((e) => e.id === projectId);
  if (idx >= 0) {
    const next = [...list];
    next[idx] = { ...next[idx], unitId };
    persist(next);
    return { list: next, added: false, removed: false };
  }
  if (list.length >= MAX_COMPARE) {
    return { list, added: false, removed: false, rejected: true };
  }
  const next = [...list, { id: projectId, slug, unitId }];
  persist(next);
  return { list: next, added: true, removed: false };
}

export function removeFromCompare(id: number) {
  const next = getCompareList().filter((e) => e.id !== id);
  persist(next);
}

export function clearCompare() {
  persist([]);
}
