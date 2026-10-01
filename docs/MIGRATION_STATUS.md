# AbadRaho v2 — Migration Status

**Compare:** [dev.abadraho.com](https://dev.abadraho.com) (Laravel) → **abadraho-v2** (Next.js 15 + Prisma + MySQL)  
**Last updated:** June 2026  
**Registry:** `src/config/features.ts` · **Detailed checklist:** `docs/CHECKLIST.md`  
**Phase 0:** ✅ Foundation — `docs/PHASE0.md`  
**Phase 1:** ✅ Auth — `docs/PHASE1.md`  
**Phase 2:** ✅ Wishlist / reviews / recent views — `docs/PHASE2.md`  
**Phase 3:** ✅ Project detail parity — `docs/PHASE3.md`

---

## Phase 1 — Authentication ✅ (June 2026)

| Task | Status |
|------|--------|
| Native login/logout + session cookie | ✅ |
| Register + phone OTP (rate-limited resend) | ✅ |
| Email verification + resend | ✅ |
| Password reset + change | ✅ |
| Profile PATCH | ✅ |
| Google / Facebook OAuth routes | ✅ (configure env) |
| Middleware: `/account/*`, `/broker/*` | ✅ |
| `session-url`, `phone`, `user-exists` APIs | ✅ |

---

## Phase 0 — Foundation ✅ (June 2026)

| Task | Status |
|------|--------|
| Prisma schema — legacy tables (`blog`, `room_type_unit`, voucher, tag, amenity, teams, activity log, …) | ✅ |
| Proxy audit — all legacy API smoke paths documented | ✅ (`PHASE0_PROXY_AUDIT.md`) |
| `user_search_history` table map + housing-calc columns | ✅ |
| Admin CRUD — amenities, utilities, tags, room types, vouchers, teams, payment schedules, videos, activity log, customers, downloaded vouchers | ✅ |
| Foundation health — `GET /api/v1/health` + `npm run foundation:check` | ✅ |
| Legacy proxy smoke tests (API + off-plan map-data) | ✅ |
| `USE_DATABASE` documented in `.env.example` | ✅ |

**Verify:** `npm run foundation:check` → `docs/PHASE0_REPORT.json`

---

## خلاصہ (Summary)

| حصہ | Legacy (تقریباً) | v2 میں | حالت |
|-----|------------------|--------|------|
| Public pages & listings | ~40 routes | زیادہ تر موجود | **~85%** |
| Project detail | 1 main + sub-features | Full DB detail + APIs | **~95%** |
| Compare / Wishlist | 6 routes | DB wishlist + local compare | **~85%** |
| User auth & account | 15+ routes | Native `/api/v1/auth/*` + pages | **~90%** |
| Broker portal | 12+ routes | Hub + legacy links | **~35%** |
| Admin panel | 30+ modules | Grouped sidebar + native CRUD (legacy Excel/import links) | **~85%** |
| Mobile `/api/*` | 25+ endpoints | `/api/v1/*` + proxy | **~45%** |

**Local DB:** `USE_DATABASE=true` + `markprop_dev_abadraho` — **69 projects**, **86 users**, map + filters DB se.

---

## ✅ Jo ho chuka hai (Done in v2)

### Public website
| Feature | Legacy | v2 |
|---------|--------|-----|
| Home / off-plan listings | `/`, `/off-plan` | `/` (+ `?view=map`) |
| Reelly UI (sidebar, filter chips, split map) | — | AppShell + FilterChipsBar |
| Map data + markers (images) | `/off-plan/map-data` | `/api/v1/projects/map-data` (DB) |
| Filters (Developer, Price, Unit type, …) | AJAX filters | URL params + DB `project-filter.service` |
| Project detail | `/project/{slug}` | `/project/[slug]` |
| Units table | Blade | `UnitsTable` |
| Inquiry form | Zoho POST | `InquiryForm` + `/api/v1/inquiries` |
| Payment calculator | POST schedule | `PaymentCalculator` + API |
| PDF download | `/download-pdf/...` | `/download-pdf/[id]/[file]` |
| Compare (basic) | `/compare` | `/compare` (localStorage, max 4) |
| Compare advanced | `/compare-2` | `/compare-2` |
| Blog list + article | `/blogs`, `/{cat}/{slug}` | `/blog`, `/blog/[category]/[slug]` |
| About / Terms / Contact | static routes | `/about-us`, `/terms-conditions`, `/contact` |
| Sitemap | `sitemap.xml` | `/sitemap.xml` |
| Interest form | `/submit-interest` | `/api/v1/interest` |
| Broker short link | `/p/{slug}/{code}` | `/p/[slug]/[code]` |
| Search history API | `/api/search` | `/api/v1/search-history` |

### Admin (native CRUD — MySQL + Prisma)
Sidebar matches legacy **dev.abadraho.com** groups: Dashboard, Project Management, User Management, Builder Management, Inquiry Management, Blogs, Tags, Activity, Vouchers (+ More).

| Module | v2 route | Notes |
|--------|----------|-------|
| Login + session | `/admin/login` | Staff `users` + `admins` table; builder = limited menu |
| Dashboard stats | `/admin/dashboard` | Live counts from DB |
| Projects (+ pending/active) | `/admin/projects`, `.../pending`, `.../active` | List/create/edit/delete |
| Units | `/admin/units` | |
| Areas | `/admin/areas` | |
| Project types | `/admin/project-types` | |
| Progress status | `/admin/progress` | |
| Builders | `/admin/builders` | |
| Users | `/admin/users` | Fixed: nullable email |
| Agents / Brokers | `/admin/agents` | |
| Inquiries (Zoho) | `/admin/inquiries` | |
| Blogs + categories | `/admin/blogs`, `/admin/blog-categories` | |
| Reviews | `/admin/reviews` | |
| Contact messages | `/admin/contact` | |
| Search history | `/admin/search-history` | |
| Favorites / wishlists | `/admin/favorites` | |

### Infrastructure
- Legacy API bridge (`LEGACY_API_URL`) when needed  
- `GET /api/v1/projects`, `map-data`, `meta/filters`, `meta/areas`  
- Admin API `/api/admin/*` + cookie auth  
- XAMPP import scripts + `docs/XAMPP_SETUP.md`  
- Feature registry `src/config/features.ts`

---

## 🟡 Adha / Partial (v2 میں ہے lekin poora nahi)

| Feature | Legacy | v2 میں kya hai | Kya baqi hai |
|---------|--------|----------------|--------------|
| **Search** | POST listings search | `?q=` + filter chips | Advanced / housing-calc search parity |
| **Reviews** | Add rating + admin | Display + API stub | Full DB reviews CRUD on public |
| **Voucher** | `generate-voucher` | Button + API proxy | Native PDF/voucher like legacy |
| **Similar projects** | API similar | Partial on detail | Reliable DB similar list |
| **Compare-2 deep** | `gettypes`, `get_project_compare` | Basic table | Unit-level compare APIs |
| **Wishlist** | Auth + DB sync | Page + API + localStorage | Full login-required server sync |
| **User login** | Web + API | `/login` + `/api/v1/auth/login` | All edge cases / session parity |
| **Register + OTP** | Phone verify flow | Pages + `/api/v1/auth/otp` stub | Full OTP like legacy |
| **OAuth** | Google / Facebook | Links to legacy | Native OAuth in v2 |
| **Profile update** | POST profile | Read profile page | POST update native |
| **Password reset** | Email token flow | Page shell | Full reset pipeline |
| **Broker hub** | Full dashboard | `/broker` + legacy links | Native pitch decks / WhatsApp / analytics |
| **Blog content** | DB | DB or fallback | Rich editor / media parity |
| **Project filter API** | POST filter | Proxy `/api/v1/projects/filter` | 100% field parity with Laravel |
| **Mobile API** | `/api/projects/*` etc. | Partial `/api/v1/*` + proxy | Builder app API, teams API |
| **Activity log (client)** | Custom activity | — | v2 tracking |
| **Recent views** | Session | — | Not built |

---

## ❌ Jo abhi v2 mein nahi (Legacy par hai — reh gaya)

### Public / user (high priority)
| # | Legacy route / feature | Notes |
|---|------------------------|-------|
| 1 | `/register` full flow | Phone OTP verify end-to-end |
| 2 | `auth/google`, `auth/facebook` native | Abhi legacy redirect |
| 3 | `/email/verify`, resend | `/verify-email` shell only |
| 4 | `/reset-password` → token email | Full mail + token pages |
| 5 | `/profilepage`, `/profile` legacy | v2: `/account/profile` partial |
| 6 | `/my-profile-update`, password change | API proxy missing |
| 7 | `/add-wishlist/{id}` server | Auth middleware behavior |
| 8 | `/projects/generate-voucher` full | Native voucher PDF |
| 9 | Unit rooms on detail | Legacy unit room breakdown |
| 10 | `/getunits` AJAX | Unit picker APIs |
| 11 | `/resend-phone-no-otp`, `/verify-phone-no-otp` | Register OTP |
| 12 | `/requested-session-url` | Session helper |
| 13 | `/create/custom-activity-log` | Analytics |

### Broker (poora module)
| Legacy | Status in v2 |
|--------|----------------|
| `/broker/projects` | Page → legacy link |
| `/broker/analytics` | Page → legacy link |
| `/broker/pitch-decks` (generate, download, regenerate) | Legacy only |
| `/broker/whatsapp-cards` (share, regenerate) | Legacy only |
| `/broker-dashboard` redirect | Not needed if hub works |

### Admin — sirf legacy link (page hai, native CRUD nahi)
In v2 admin menu **khulta hai** lekin andar **“Open legacy admin”** — Prisma model nahi:

| Module | Legacy path |
|--------|-------------|
| Vouchers | `/admin/voucher` |
| Tags | `/admin/tag` |
| Room types | `/admin/room_type` |
| Amenities | `/admin/amenities` |
| Utilities | `/admin/utilities` |
| Teams (my/joined) | `/admin/my-teams`, `/admin/teams` |
| Payment schedules + export | `/admin/payment-schedules` |
| Activity log | `/admin/activity-log` |
| CSV import (projects/units/areas/types) | `import-projects`, etc. |
| Customers | `/admin/cutomers` |
| Project videos | admin project media |
| Admin profile / change password | `/admin/admin-profile` |
| Downloaded vouchers list | `/admin/downloaded-voucher` |
| Housing / advance search history | `/admin/housing-calc-search-history`, `advance-search-history` |
| Inquiry Excel export | `/admin/export/listing` |
| Contact Excel export | `/admin/export/contact` |

### Admin — legacy features without v2 menu page
| Feature | Legacy |
|---------|--------|
| Admin register | `/admin/register` |
| Unit rooms CRUD | `/admin/unit/{id}/room` |
| Project amenities/utilities bulk update | POST project update |
| Agent create/edit/show/delete | Full agent CRUD |
| User create/delete | `admin/add-new-user` |
| Role / forbidden | `/admin-forbidden` |

### API / mobile (`routes/api.php`)
| Endpoint group | v2 |
|----------------|-----|
| `POST /api/filter` (global search) | Partial |
| `projects/unit-measurement` | Proxy / missing |
| `POST /api/user-exists`, `update-phone` | Missing |
| Builder `api/admin/project/*` (mobile builder app) | Proxy only |
| Teams API (`my-teams`, `store`, …) | Missing |
| `unit-types` POST | Missing |

### Dev / ops (v2 mein zaroorat nahi)
- `/config-cache`, `/clear-cache`, `/route-clear`, `/run`  
- Test mail routes (`sendbasicemail`, …)  
- `import-areas` standalone (without admin UI)

---

## Database / Prisma — schema gaps

Legacy DB tables are now mapped in `prisma/schema.prisma` (Phase 0). Remaining gaps are **feature wiring**, not missing models:

| Domain | Phase 0 status |
|--------|----------------|
| Vouchers + user vouchers | ✅ Prisma + admin CRUD |
| Tags, amenities, utilities | ✅ Prisma + admin CRUD |
| Room types + unit rooms | ✅ Prisma (admin list via units) |
| Teams | ✅ Prisma + admin CRUD |
| Payment schedules | ✅ Prisma + admin CRUD |
| Activity log | ✅ Prisma + admin CRUD |
| Customers | ✅ Users filtered `userTypeId = -10024` |

**Still to wire in later phases:** CSV import UI, Excel exports, unit rooms admin UI, project amenity bulk update on project edit.

---

## Pehle kya karna chahiye (Suggested order)

1. ~~**Prisma foundation** — all legacy tables mapped~~ ✅ Phase 0 done
2. **Auth complete** — register, OTP, OAuth, profile/password update ← **Phase 1**
3. **Wishlist** — logged-in server sync
4. **Broker native** — pitch deck + WhatsApp card generation
5. **Admin remaining** — CSV import, Excel exports, unit rooms UI
6. **Compare-2** — `gettypes` + unit compare APIs
7. **Mobile API parity** — `/api/v1` documentation + tests
8. **Cutover** — DNS `dev.abadraho.com` → v2 (ROADMAP Phase 6)

---

## Quick links

| | |
|--|--|
| v2 local | http://localhost:3000 |
| v2 admin | http://localhost:3000/admin/login |
| Legacy site | https://dev.abadraho.com |
| Legacy admin | https://dev.abadraho.com/admin/login |
| Checklist (A–J) | `docs/CHECKLIST.md` |
| Architecture | `docs/ARCHITECTURE.md` |
| XAMPP DB setup | `docs/XAMPP_SETUP.md` |

---

*Is file ko har bari sprint ke baad update karein jab feature ship ho.*
