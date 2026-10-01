/**
 * Single source for AbadRaho v2 colors.
 * Imported by `tailwind.config.ts`; keep `:root` in `globals.css` in sync.
 *
 * Usage:
 * - `brand` (DEFAULT) — primary UI: nav active, buttons, table headers (Reelly / zinc-900)
 * - `brand-accent` — legacy AbadRaho red; marketing CTAs only, not chrome/nav
 * - `surface` — panels, borders, page chrome
 * - `sponsor` — bronze mark for paid ad placements only (sponsored-ad-sections.tsx); never
 *   used for real navigation/CTAs so it never competes with `brand-accent`
 */
export const designTokens = {
  brand: {
    /** Primary UI — maps to zinc-900 */
    DEFAULT: "#18181b",
    foreground: "#ffffff",
    muted: "#f4f4f5",
    dark: "#09090b",
    /** Legacy AbadRaho red — accent CTAs, not navigation */
    accent: "#ec1c24",
    accentForeground: "#ffffff",
    accentHover: "#d41920",
  },
  surface: {
    DEFAULT: "#ffffff",
    secondary: "#fafafa",
    border: "#e4e4e7",
  },
  sponsor: {
    DEFAULT: "#93672a",
    ink: "#6e4d1f",
    tint: "#f7f0e4",
    tintBorder: "#e9dcc4",
  },
} as const;

/** CSS custom properties — mirror into `globals.css` :root */
export const designCssVars = {
  "--background": designTokens.surface.secondary,
  "--foreground": designTokens.brand.DEFAULT,
  "--brand-primary": designTokens.brand.DEFAULT,
  "--brand-primary-foreground": designTokens.brand.foreground,
  "--brand-accent": designTokens.brand.accent,
  "--brand-accent-foreground": designTokens.brand.accentForeground,
  "--surface-border": designTokens.surface.border,
} as const;

/** Shared Tailwind class strings — use instead of raw hex or duplicated zinc-900 */
export const designTw = {
  /** Page canvas — public + admin (not the legacy gray admin backdrop) */
  pageCanvas: "bg-zinc-50",
  /** App + admin outer shell (same listings-app chrome) */
  shell: "flex h-screen overflow-hidden bg-zinc-50",
  shellColumn: "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
  shellMain: "min-h-0 min-w-0 flex-1 overflow-y-auto",
  shellContent: "p-4 lg:p-6",
  navActive: "bg-brand text-brand-foreground",
  navInactive: "text-zinc-700 hover:bg-zinc-100",
  tableHead: "bg-brand px-4 py-3 text-left font-semibold text-brand-foreground",
  btnPrimary: "bg-brand text-brand-foreground hover:bg-brand-dark",
  /** Public marketing / content pages */
  publicContainer: "mx-auto w-full max-w-7xl px-4 sm:px-6",
  publicSection: "py-10",
  publicCard: "rounded-2xl border border-zinc-200 bg-white shadow-sm",
} as const;
