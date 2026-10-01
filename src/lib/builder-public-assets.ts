import fs from "node:fs";
import path from "node:path";

const COVER_CANDIDATES = ["cover.webp", "cover.jpg", "cover.jpeg", "cover.png"];
const PROFILE_CANDIDATES = [
  "profile.jpg",
  "profile.jpeg",
  "profile.webp",
  "profile.png",
];

function firstExistingAsset(slug: string, candidates: string[]): string | null {
  const dir = path.join(process.cwd(), "public", "builders", slug);
  for (const filename of candidates) {
    if (fs.existsSync(path.join(dir, filename))) {
      return `/builders/${slug}/${filename}`;
    }
  }
  return null;
}

/** Resolve optional marketing images from `public/builders/{slug}/`. */
export function resolveBuilderPublicAssets(slug: string): {
  coverImageUrl: string | null;
  profileImageUrl: string | null;
} {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    return { coverImageUrl: null, profileImageUrl: null };
  }

  return {
    coverImageUrl: firstExistingAsset(normalized, COVER_CANDIDATES),
    profileImageUrl: firstExistingAsset(normalized, PROFILE_CANDIDATES),
  };
}

export function defaultBuilderPublicDescription(displayName: string): string {
  return `${displayName} develops off-plan residential projects across Pakistan. Browse live listings, payment plans, and buyer reviews on AbadRaho.`;
}
