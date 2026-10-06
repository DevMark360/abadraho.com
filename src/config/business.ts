export type SocialNetwork = "facebook" | "linkedin" | "instagram" | "youtube" | "x" | "tiktok";

/**
 * Official social profiles (set in .env; NEXT_PUBLIC_ values are baked in at build time).
 * Shown in the site footer and used as schema sameAs. Unset ones are skipped.
 */
export const socialProfiles: { network: SocialNetwork; label: string; url: string }[] = (
  [
    ["facebook", "Facebook", process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK],
    ["linkedin", "LinkedIn", process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN],
    ["instagram", "Instagram", process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM],
    ["youtube", "YouTube", process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE],
    ["x", "X (Twitter)", process.env.NEXT_PUBLIC_SOCIAL_X],
    ["tiktok", "TikTok", process.env.NEXT_PUBLIC_SOCIAL_TIKTOK],
  ] as const
)
  .map(([network, label, url]) => ({ network, label, url: url?.trim() ?? "" }))
  .filter((p) => Boolean(p.url));

/** Public business entity used in JSON-LD (LocalBusiness / Organization). */
export const businessConfig = {
  legalName: "Mark Properties",
  brandName: process.env.NEXT_PUBLIC_APP_NAME ?? "AbadRaho",
  email: process.env.NEXT_PUBLIC_BUSINESS_EMAIL ?? "enquiry@abadraho.com",
  phone: process.env.NEXT_PUBLIC_BUSINESS_PHONE?.trim() || undefined,
  address: {
    streetAddress: process.env.NEXT_PUBLIC_BUSINESS_STREET?.trim() || undefined,
    addressLocality: process.env.NEXT_PUBLIC_BUSINESS_CITY?.trim() || "Karachi",
    addressRegion: process.env.NEXT_PUBLIC_BUSINESS_REGION?.trim() || "Sindh",
    postalCode: process.env.NEXT_PUBLIC_BUSINESS_POSTAL_CODE?.trim() || undefined,
    addressCountry: "PK",
  },
  geo:
    process.env.NEXT_PUBLIC_BUSINESS_LAT && process.env.NEXT_PUBLIC_BUSINESS_LNG
      ? {
          latitude: Number(process.env.NEXT_PUBLIC_BUSINESS_LAT),
          longitude: Number(process.env.NEXT_PUBLIC_BUSINESS_LNG),
        }
      : undefined,
  areaServed: ["Karachi", "Pakistan"],
  /** Google Maps / Business Profile URL: added to sameAs and used as the office "hasMap". */
  mapUrl: process.env.NEXT_PUBLIC_GOOGLE_BUSINESS_URL?.trim() || undefined,
  /** Official profiles that confirm the brand identity for search and AI engines (schema sameAs). */
  sameAs: [
    ...socialProfiles.map((p) => p.url),
    process.env.NEXT_PUBLIC_GOOGLE_BUSINESS_URL?.trim(),
  ].filter((url): url is string => Boolean(url)),
} as const;
