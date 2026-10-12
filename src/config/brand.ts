/** Brand logo — single source of truth (public path + intrinsic size). */
export const BRAND_LOGO = {
  // Ships with the code (public/brand/ is tracked in git). Wordmark + "Search | Compare | Invest".
  src: "/brand/abadraho-logo.png",
  width: 900,
  height: 270,
} as const;

export const BRAND_LOGO_ASPECT = BRAND_LOGO.width / BRAND_LOGO.height;

export function brandLogoWidthForHeight(height: number): number {
  return Math.round((height * BRAND_LOGO.width) / BRAND_LOGO.height);
}
