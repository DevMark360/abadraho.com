/** Optional per-builder public page overrides (marketing copy + custom media). */

export type BuilderPageMediaOverride = {
  /** Public brand name shown on the profile page (e.g. "Roomi Builders"). */
  displayName?: string;
  /** Marketing blurb — never pulled from admin user account. */
  publicDescription?: string;
  /** Match builders.full_name when auto slug differs from this URL (e.g. roomi-builder). */
  nameMatch?: string;
  coverImageUrl?: string;
  profileImageUrl?: string;
};

const builderPageMediaOverrides: Record<string, BuilderPageMediaOverride> = {
  "roomi-builder": {
    displayName: "Roomi Builders",
    nameMatch: "roomi",
    publicDescription:
      "Roomi Builder develops off-plan residential projects across Pakistan. Browse live listings, payment plans, and buyer reviews on AbadRaho.",
    coverImageUrl: "/builders/roomi-builder/cover.webp",
    profileImageUrl: "/builders/roomi-builder/profile.jpg",
  },
};

export function listConfiguredBuilderPageSlugs(): string[] {
  return Object.keys(builderPageMediaOverrides);
}

export function getBuilderPageMediaOverride(slug: string): BuilderPageMediaOverride | null {
  return builderPageMediaOverrides[slug.trim().toLowerCase()] ?? null;
}

export function builderPublicPath(slug: string): `/${string}` {
  return `/${slug.trim().toLowerCase()}` as `/${string}`;
}
