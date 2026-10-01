# Legacy static assets (`public/assets/`)

v2 **does not** load legacy Metronic / theme CSS in the Next.js app shell.

## What v2 loads globally

| Asset | Loaded from |
|-------|-------------|
| `globals.css` + Tailwind tokens | `src/app/layout.tsx` |
| Font Awesome 4 (subset) | `src/styles/font-awesome-local.css` |

## What v2 does **not** load

These files live under `public/assets/` for reference or future one-off embeds only:

- `public/assets/css/style.css` (~20k lines, legacy marketing theme)
- `public/assets/css/style.bundle.css`, `bootstrap.min.css`, Metronic bundles, etc.

No `src/app/**` layout or page imports them. New v2 routes use Tailwind + `src/config/design-tokens.ts`.

## When legacy CSS might still matter

- Direct hits to static files under `/assets/css/*` (e.g. old bookmarks)
- Future iframe/embed of legacy HTML (not used in current v2 admin)

## Admin / Laravel parity notes (dev only)

- Sidebar mapping vs `master1.blade.php` → see [LEGACY_INTEGRATION_MATRIX.md](./LEGACY_INTEGRATION_MATRIX.md)
- Module `legacyPath` values → `src/config/admin-modules.ts` (internal; not shown in UI)
