/**
 * Google Maps "Embed a map" support (Google Maps → Share → Embed a map → Copy HTML).
 * Admins paste the whole <iframe> code or just its src; only the `pb` value is kept and the URL is
 * rebuilt here, so nothing but a google.com/maps/embed page can ever end up in the iframe.
 */

export type GoogleMapEmbed = {
  /** Clean https://www.google.com/maps/embed?pb=... URL. */
  src: string;
  /** Map centre from the embed (the place itself for a place embed); null when not in it. */
  lat: number | null;
  lng: number | null;
};

export const GOOGLE_MAP_EMBED_HELP =
  "Paste the embed code from Google Maps: open the place, click Share, then Embed a map, then Copy HTML.";

const HOSTS = new Set(["www.google.com", "google.com", "maps.google.com"]);
/** Characters Google uses in pb (already URL-encoded); anything else is rejected. */
const PB_PATTERN = /^[A-Za-z0-9!._~%*+-]+$/;
const MAX_PB = 4000;

function coordsFromPb(pb: string): { lat: number | null; lng: number | null } {
  let decoded = pb;
  try {
    decoded = decodeURIComponent(pb);
  } catch {
    // Keep the raw value; the numbers are plain ASCII either way.
  }
  // Camera block: !2d<longitude>!3d<latitude>.
  const match = decoded.match(/!2d(-?\d{1,3}(?:\.\d+)?)!3d(-?\d{1,2}(?:\.\d+)?)/);
  if (!match) return { lat: null, lng: null };
  const lng = Number(match[1]);
  const lat = Number(match[2]);
  const ok = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  return ok ? { lat, lng } : { lat: null, lng: null };
}

/**
 * Reads an embed from pasted text. Returns null for empty input, `{ error }` when the text is not
 * a Google Maps embed.
 */
export function parseGoogleMapEmbed(input: string | null | undefined): GoogleMapEmbed | { error: string } | null {
  const text = input?.trim();
  if (!text) return null;

  let raw = text;
  if (/<iframe/i.test(text)) {
    const src = text.match(/\ssrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!src) return { error: GOOGLE_MAP_EMBED_HELP };
    raw = src;
  }
  raw = raw.replace(/&amp;/g, "&").trim();

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { error: GOOGLE_MAP_EMBED_HELP };
  }
  if (url.protocol !== "https:" || !HOSTS.has(url.hostname) || url.pathname !== "/maps/embed") {
    return { error: GOOGLE_MAP_EMBED_HELP };
  }
  // Read pb from the raw query so its URL encoding stays exactly as Google wrote it.
  const pb = url.search.match(/[?&]pb=([^&#]+)/)?.[1];
  if (!pb || pb.length > MAX_PB || !PB_PATTERN.test(pb)) return { error: GOOGLE_MAP_EMBED_HELP };

  return { src: `https://www.google.com/maps/embed?pb=${pb}`, ...coordsFromPb(pb) };
}

/** The clean src for a stored value, or null when it isn't a valid embed. */
export function googleMapEmbedSrc(stored: string | null | undefined): string | null {
  const parsed = parseGoogleMapEmbed(stored);
  return parsed && "src" in parsed ? parsed.src : null;
}
