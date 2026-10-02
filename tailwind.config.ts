import type { Config } from "tailwindcss";
import { designTokens } from "./src/config/design-tokens";

const { brand, surface, sponsor, clay } = designTokens;

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: brand.DEFAULT,
          foreground: brand.foreground,
          muted: brand.muted,
          dark: brand.dark,
          accent: brand.accent,
          "accent-foreground": brand.accentForeground,
          "accent-hover": brand.accentHover,
        },
        surface: {
          DEFAULT: surface.DEFAULT,
          secondary: surface.secondary,
          border: surface.border,
        },
        clay: {
          canvas: clay.canvas,
          surface: clay.surface,
          well: clay.well,
          line: clay.line,
        },
        sponsor: {
          DEFAULT: sponsor.DEFAULT,
          ink: sponsor.ink,
          tint: sponsor.tint,
          "tint-border": sponsor.tintBorder,
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      /* Claymorphism — soft, puffy surfaces: big radii, a warm tinted canvas, and paired
         outer (lift) + inner (highlight/shade) shadows. Values live in design-tokens.ts. */
      borderRadius: {
        clay: clay.radius,
        "clay-lg": clay.radiusLg,
      },
      boxShadow: { ...clay.shadow },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
