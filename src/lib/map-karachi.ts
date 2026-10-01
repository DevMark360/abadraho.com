/** Default map focus — Karachi, Pakistan */
export const KARACHI_CENTER: [number, number] = [24.8607, 67.0011];
export const KARACHI_DEFAULT_ZOOM = 11;

/** Soft bounds so the map stays near Karachi / Sindh */
export const KARACHI_MAX_BOUNDS = {
  south: 23.8,
  west: 66.5,
  north: 25.4,
  east: 68.2,
} as const;

/** Ignore stray UAE/test coordinates when fitting the map */
export function isPakistanCoord(lat: number, lng: number): boolean {
  return lat >= 23 && lat <= 37 && lng >= 60 && lng <= 78;
}

/**
 * Normalize legacy project coordinates for Karachi / Pakistan.
 * - Drops 0,0 and non-finite values
 * - Auto-swaps rows stored as [longitude, latitude]
 */
export function normalizePakistanCoords(
  lat: number | null | undefined,
  lng: number | null | undefined
): { lat: number; lng: number } | null {
  if (lat == null || lng == null) return null;
  const rawLat = Number(lat);
  const rawLng = Number(lng);
  if (!Number.isFinite(rawLat) || !Number.isFinite(rawLng)) return null;
  if (rawLat === 0 && rawLng === 0) return null;

  let la = rawLat;
  let ln = rawLng;

  if (la >= 60 && la <= 78 && ln >= 23 && ln <= 37) {
    [la, ln] = [ln, la];
  }

  if (!isPakistanCoord(la, ln)) return null;
  return { lat: la, lng: ln };
}
