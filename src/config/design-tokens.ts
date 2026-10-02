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
  /**
   * Claymorphism (soft UI) — cool light-grey canvas; white surfaces with large radii and
   * very soft, diffuse shadows: an outer cool-grey lift + a white top-left glow, plus a faint
   * inner highlight. Shadows are tinted slate (not black) so everything stays soft.
   */
  clay: {
    canvas: "#e9edf2",
    surface: "#f9fbfc",
    /** Recessed wells: inputs, stat tiles, segmented controls */
    well: "#e3e8ee",
    line: "#dfe5ec",
    radius: "1.25rem",
    radiusLg: "1.75rem",
    shadow: {
      clay:
        "10px 12px 28px -8px rgba(100, 116, 139, 0.26), -8px -8px 22px rgba(255, 255, 255, 0.95), inset 1px 1px 2px rgba(255, 255, 255, 0.9)",
      "clay-sm":
        "5px 6px 14px -5px rgba(100, 116, 139, 0.3), -4px -4px 10px rgba(255, 255, 255, 0.95), inset 1px 1px 1px rgba(255, 255, 255, 0.9)",
      "clay-hover":
        "14px 18px 34px -8px rgba(100, 116, 139, 0.32), -8px -8px 22px rgba(255, 255, 255, 0.95), inset 1px 1px 2px rgba(255, 255, 255, 0.9)",
      "clay-inset":
        "inset 3px 3px 7px rgba(100, 116, 139, 0.16), inset -3px -3px 7px rgba(255, 255, 255, 0.95)",
      "clay-btn":
        "4px 7px 16px -5px rgba(24, 24, 27, 0.5), inset 1px 1px 2px rgba(255, 255, 255, 0.25)",
      "clay-btn-accent":
        "4px 8px 18px -5px rgba(236, 28, 36, 0.5), inset 1px 1px 2px rgba(255, 255, 255, 0.35)",
      "clay-pressed":
        "inset 3px 3px 6px rgba(0, 0, 0, 0.25), inset -2px -2px 4px rgba(255, 255, 255, 0.12)",
    },
  },
} as const;

/** CSS custom properties — mirror into `globals.css` :root */
export const designCssVars = {
  "--background": designTokens.clay.canvas,
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
  pageCanvas: "bg-clay-canvas",
  /** App + admin outer shell (same listings-app chrome) */
  shell: "flex h-screen overflow-hidden bg-clay-canvas",
  shellColumn: "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
  shellMain: "min-h-0 min-w-0 flex-1 overflow-y-auto",
  shellContent: "p-4 lg:p-6",
  navActive: "bg-gradient-to-b from-zinc-700 to-zinc-900 text-brand-foreground shadow-clay-btn",
  navInactive: "text-zinc-600 hover:bg-clay-well hover:text-zinc-900",
  /** Soft table header — clay well with small caps text (readable on dense admin tables) */
  tableHead:
    "bg-clay-well px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500",
  btnPrimary:
    "bg-gradient-to-b from-zinc-700 to-zinc-900 text-brand-foreground shadow-clay-btn hover:from-zinc-600",
  /** Public marketing / content pages */
  publicContainer: "mx-auto w-full max-w-7xl px-4 sm:px-6",
  publicSection: "py-10",
  /** Floating clay sidebar panel (public + staff shells) */
  sidebarPanel:
    "flex h-full w-full shrink-0 flex-col overflow-hidden rounded-clay-lg border border-white/80 bg-clay-surface shadow-clay",
  publicCard: "rounded-clay-lg border border-white/80 bg-clay-surface shadow-clay",
  /** Clay card that lifts on hover — clickable cards (listings, links) */
  publicCardInteractive:
    "rounded-clay-lg border border-white/80 bg-clay-surface shadow-clay transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-clay-hover",
  /** Recessed clay well — stat tiles, info boxes inside a card */
  clayWell: "rounded-clay bg-clay-well shadow-clay-inset",
  /** Small raised clay chip/tile */
  clayTile: "rounded-clay border border-white/80 bg-clay-surface shadow-clay-sm",
} as const;
