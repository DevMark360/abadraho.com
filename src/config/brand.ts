/** Brand logo — single source of truth (public path + intrinsic size). */
export const BRAND_LOGO = {
  src: "/assets/images/main-logo.png",
  width: 252,
  height: 101,
} as const;

export const BRAND_LOGO_ASPECT = BRAND_LOGO.width / BRAND_LOGO.height;

export function brandLogoWidthForHeight(height: number): number {
  return Math.round((height * BRAND_LOGO.width) / BRAND_LOGO.height);
}
