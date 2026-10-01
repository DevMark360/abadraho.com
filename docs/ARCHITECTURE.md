# Architecture — AbadRaho v2

## Request flow

```
Browser
  → Next.js Route (src/app/**/page.tsx or route.ts)
  → Server Service (src/server/services/*.ts)
  → Prisma → MySQL (legacy tables)
  → React Server Components render HTML
```

Client interactivity (filters) uses URL search params + `useRouter` — same pattern as [Reelly filters](https://find.reelly.io/).

## Layer responsibilities

| Layer | Location | Do | Don't |
|-------|----------|-----|-------|
| **Route** | `src/app/` | Parse params, call service, compose layout | Raw Prisma queries |
| **Service** | `src/server/services/` | Business rules, filtering, mapping | Return JSX |
| **Component** | `src/components/` | Present data, emit events | Direct DB access |
| **Model** | `prisma/schema.prisma` | Schema, relations | UI logic |
| **Config** | `src/config/` | Constants, feature flags | Heavy logic |

## Feature modules (extend here)

When adding a feature from legacy Laravel:

1. Add entry in `src/config/features.ts` (`status: planned → in_progress → done`).
2. Add Prisma models if new tables (or reuse existing `@@map`).
3. Create `src/server/services/<feature>.service.ts`.
4. Add `src/app/<route>/page.tsx` and optional `src/app/api/v1/<feature>/route.ts`.
5. Add components under `src/components/<feature>/`.

## Auth (planned)

```
Auth.js → Prisma User adapter → users table
Roles via user_type_id (see src/config/site.ts userTypeIds)
Middleware: middleware.ts protects /admin, /broker, /account/*
```

## API versioning

- Public JSON: `/api/v1/*`
- Mirrors legacy `/api/*` gradually
- Mobile apps can switch base URL when ready

## Migration from Laravel

| Legacy | v2 |
|--------|-----|
| `routes/web.php` | `src/app/**` |
| `app/Http/Controllers/*` | `src/server/services/*` |
| `app/Models/*` | `prisma/schema.prisma` |
| `resources/views/*` | `src/components/*` + `src/app/*` |
| `app/Helpers/*` | `src/lib/*` or services |

Optional bridge: set `LEGACY_API_URL` to proxy unmigrated endpoints.

## Security defaults

- TypeScript strict mode
- Env secrets not committed (`.env` gitignored)
- CSRF via Next.js for server actions (when forms added)
- Prisma parameterized queries (no raw SQL unless necessary)
- Rate limit API routes (add `@upstash/ratelimit` in production)

## Testing (recommended next)

- Unit: services with mocked Prisma
- E2E: Playwright on `/` and `/project/[slug]`
