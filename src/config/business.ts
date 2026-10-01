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
  sameAs: [
    process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK,
    process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN,
    process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM,
    process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE,
  ].filter((url): url is string => Boolean(url?.trim())),
} as const;
