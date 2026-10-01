"use client";

const LS_KEY = "abadraho_viewed_ids";
const MAX_STORED = 20;

export function saveViewedId(projectId: number): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LS_KEY);
    const existing: number[] = raw ? (JSON.parse(raw) as number[]) : [];
    const updated = [projectId, ...existing.filter((id) => id !== projectId)].slice(0, MAX_STORED);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
  } catch {
    // storage full — ignore
  }
}

export function readLocalViewedIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : [];
  } catch {
    return [];
  }
}
