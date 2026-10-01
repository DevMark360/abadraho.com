const KEY = "abadraho_wishlist";

export interface WishlistEntry {
  id: number;
  slug: string;
}

export function getWishlist(): WishlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as WishlistEntry[];
  } catch {
    return [];
  }
}

export function isInWishlist(id: number): boolean {
  return getWishlist().some((e) => e.id === id);
}

export function toggleWishlist(id: number, slug: string): WishlistEntry[] {
  const list = getWishlist();
  const idx = list.findIndex((e) => e.id === id);
  const next =
    idx >= 0 ? list.filter((e) => e.id !== id) : [...list, { id, slug }];
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("abadraho-wishlist"));
  return next;
}
