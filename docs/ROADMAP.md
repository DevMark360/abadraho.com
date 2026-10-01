# Migration roadmap — Laravel → AbadRaho v2

## Phase 1 — Foundation ✅ (current)

- [x] Next.js + TypeScript + Tailwind scaffold
- [x] `npm install` + Prisma client generated
- [x] Prisma schema (core tables)
- [x] Reelly-style home: filters + project grid + search
- [x] Legacy API bridge (`LEGACY_API_URL`) when MySQL offline
- [x] Project detail shell
- [x] API `GET /api/v1/projects`
- [x] Feature registry + docs
- [x] Dev server (`npm run dev` → http://localhost:3000)

## Phase 2 — Public site (priority)

- [ ] Connect real MySQL + verify Prisma `@@map` column names
- [ ] Project detail: units table, reviews, gallery
- [ ] Search / filter (parity with `ProjectController@filter`)
- [ ] Off-plan map (`/off-plan/map-data`)
- [ ] Compare (`/compare`, `/compare-2` logic)
- [ ] Wishlist + auth
- [ ] Payment schedule calculator
- [ ] Voucher generate/download
- [ ] Blog + static pages (about, terms, contact)
- [ ] Inquiry form → Zoho

## Phase 3 — Auth & accounts

- [ ] Auth.js: email/password, Google, Facebook
- [ ] Phone OTP (legacy `RegisterController`)
- [ ] Profile, password reset
- [ ] Email verification

## Phase 4 — Admin panel

Migrate each `Admin\*Controller` to `/admin/<resource>`:

- [ ] Dashboard, projects, units, areas, builders
- [ ] Users, agents, teams
- [ ] Blogs, tags, amenities, utilities
- [ ] Inquiries, contact, search history
- [ ] Vouchers, payment schedules, activity log
- [ ] CSV imports

## Phase 5 — Broker & API

- [ ] Broker dashboard, pitch decks, WhatsApp cards
- [ ] Short links `/p/[slug]/[code]`
- [ ] Full `/api/v1` parity for mobile apps

## Phase 6 — Cutover

- [ ] DNS: dev.abadraho.com → v2
- [ ] Decommission Laravel frontend (keep API bridge if needed)

---

Update `src/config/features.ts` status as each item ships.
