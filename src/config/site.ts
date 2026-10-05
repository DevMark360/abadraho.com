import { BRAND_LOGO, BRAND_LOGO_ASPECT } from "@/config/brand";

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "AbadRaho",
  tagline: "Find your next off-plan property",
  defaultTitle: "AbadRaho: Off-plan Properties in Pakistan",
  seoDescription:
    "Discover off-plan apartments, villas, and plots in Karachi and across Pakistan. Compare payment plans, explore projects on a map, and connect with trusted builders on AbadRaho.",
  defaultKeywords: [
    "off-plan properties",
    "Karachi real estate",
    "Pakistan property",
    "payment plans",
    "AbadRaho",
  ],
  url: process.env.NEXT_PUBLIC_APP_URL ?? "https://dev.abadraho.com",
  /** Fallback social preview image — replace with a 1200×630 JPG/PNG in production. */
  defaultOgImage: BRAND_LOGO.src,
} as const;

/** @deprecated Use BRAND_LOGO from `@/config/brand` */
export const brandAssets = {
  logo: BRAND_LOGO.src,
  logoAspect: BRAND_LOGO_ASPECT,
} as const;

export const userTypeIds = {
  superAdmin: -10021,
  admin: -10022,
  employee: -10023,
  websiteUser: -10024,
  builder: -10025,
  buyer: -10026,
  agent: -10027,
} as const;

/** Legacy `user_types` rows — used when that table is missing from the DB. */
export const userTypeLabels: Record<number, string> = {
  [userTypeIds.superAdmin]: "Super Admin",
  [userTypeIds.admin]: "Admin",
  [userTypeIds.employee]: "Employee",
  [userTypeIds.websiteUser]: "Web Site User",
  [userTypeIds.builder]: "Builder",
  [userTypeIds.buyer]: "Buyer",
  [userTypeIds.agent]: "Agent",
};

export function defaultUserTypeOptions(): { id: number; name: string }[] {
  return Object.entries(userTypeLabels)
    .filter(([id]) => Number(id) !== userTypeIds.superAdmin)
    .map(([id, name]) => ({ id: Number(id), name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function userTypeLabel(id: number | null | undefined): string {
  if (id == null) return "—";
  return userTypeLabels[id] ?? `Type ${id}`;
}
