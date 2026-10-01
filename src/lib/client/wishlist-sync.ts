import { apiFetch } from "@/lib/client/api-fetch";
import { getWishlist, isInWishlist, toggleWishlist as toggleLocal } from "@/lib/client/wishlist-store";

let serverIds: number[] | null = null;
let serverLoaded = false;

export async function loadServerWishlistIds(): Promise<number[]> {
  try {
    const res = await fetch("/api/v1/wishlist/ids");
    if (!res.ok) {
      serverLoaded = true;
      serverIds = [];
      return [];
    }
    const json = await res.json();
    serverIds = json.projectIds ?? [];
    serverLoaded = true;
    window.dispatchEvent(new Event("abadraho-wishlist"));
    return serverIds ?? [];
  } catch {
    serverLoaded = true;
    serverIds = [];
    return [];
  }
}

export function isInWishlistSynced(projectId: number): boolean {
  if (serverIds?.includes(projectId)) return true;
  return isInWishlist(projectId);
}

export async function syncLocalWishlistToServer(): Promise<void> {
  const local = getWishlist().map((e) => e.id);
  if (!local.length) return;
  await apiFetch("/api/v1/wishlist/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectIds: local }),
  });
  await loadServerWishlistIds();
}

export async function toggleWishlist(projectId: number, slug: string): Promise<void> {
  const wasLocal = isInWishlist(projectId);
  toggleLocal(projectId, slug);

  try {
    const me = await fetch("/api/v1/auth/me");
    const json = await me.json();
    if (!json.user) return;

    const nowWished = !wasLocal;
    if (nowWished) {
      await apiFetch("/api/v1/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      serverIds = [...(serverIds ?? []), projectId];
    } else {
      await apiFetch(`/api/v1/wishlist?projectId=${projectId}`, { method: "DELETE" });
      serverIds = (serverIds ?? []).filter((id) => id !== projectId);
    }
  } catch {
    /* offline */
  }
}

export function resetWishlistSyncCache() {
  serverIds = null;
  serverLoaded = false;
}

export function isWishlistServerLoaded() {
  return serverLoaded;
}
