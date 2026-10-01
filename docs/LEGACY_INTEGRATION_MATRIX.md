# dev.abadraho.com → abadraho-v2 — Full Feature & API Integration Matrix

**Legacy:** Laravel at `dev.abadraho.com`  
**v2:** Next.js at `e:\abadraho-v2` (local: `http://localhost:3000`)  
**Last updated:** June 2026

### Status legend

| Symbol | Meaning |
|--------|---------|
| ✅ | **Integrated** — Native v2 page and/or API; works with local MySQL when `USE_DATABASE=true` |
| 🟡 | **Partial** — UI or route exists; uses legacy proxy, stub, or incomplete DB logic |
| 🔲 | **Not integrated** — Only on legacy site |
| ⏭ | **Skipped** — Dev/ops only; not needed in v2 |

### Data sources in v2

| Source | When used |
|--------|-----------|
| **DB** | Prisma + `markprop_dev_abadraho` (projects, users, admin CRUD, map, filters) |
| **Legacy API** | `LEGACY_API_URL` → `https://dev.abadraho.com/api` |
| **Legacy site** | `NEXT_PUBLIC_LEGACY_SITE_URL` → pages, OAuth, some forms |
| **Proxy** | `/api/v1/proxy/*` forwards to legacy API or site |
| **Client** | `localStorage` (compare list), mock data fallback |

---

## 1. Public website (web routes)

| # | Legacy function | Legacy route / method | v2 route / page | v2 API / integration | Status |
|---|-----------------|----------------------|-----------------|----------------------|--------|
| 1.1 | Home / listings | `GET /` | `GET /` | `listProjects()` — **DB**; filters via `project-filter.service` | ✅ |
| 1.2 | Off-plan index | `GET /off-plan` | `GET /` or `/off-plan` | Same as home | ✅ |
| 1.3 | Off-plan map JSON | `GET /off-plan/map-data` | — | `GET /api/v1/projects/map-data` — **DB** (lat/lng + images) | ✅ |
| 1.4 | Off-plan filter AJAX | `GET /off-plan/filter` | Filter chips → URL params | `GET /api/v1/off-plan/filter` → **legacy proxy** | 🟡 |
| 1.5 | Projects listing | `GET /projects`, `/projects/listings` | `GET /projects` → redirects `/` | Same as home | ✅ |
| 1.6 | Projects by slug filter | `GET /projects/{slug}` | `GET /projects/[slug]` | Listing filter (legacy pattern) | 🟡 |
| 1.7 | Project filter GET | `GET /projects/getlistings` | — | `GET /api/v1/projects` + query filters — **DB** | ✅ |
| 1.8 | Project filter POST | `POST /projects/listings` (search) | `?q=` on `/` | `GET /api/v1/projects/filter` → **legacy proxy** | 🟡 |
| 1.9 | New project listings POST | `POST /projects/listings` (filter) | Filter bar | Partial **DB** filters; not 100% parity | 🟡 |
| 1.10 | Project detail | `GET /project/{slug}` | `GET /project/[slug]` | `getProjectDetail()` — legacy API first, then **DB** | ✅ |
| 1.11 | Payment schedule calc | `POST /projects/payment-schedule` | On project page | `POST /api/v1/payment-schedule` | ✅ |
| 1.12 | Generate voucher | `POST /projects/generate-voucher` | Voucher button | `POST /api/v1/vouchers/generate` + legacy URL | 🟡 |
| 1.13 | Download PDF | `GET /download-pdf/{id}/{filename}` | `GET /download-pdf/[id]/[file]` | Proxies / legacy file path | ✅ |
| 1.14 | Get units by project | `GET /getunits` | — | Partial via project detail units | 🟡 |
| 1.15 | Unit types (frontend) | `POST unit-types` | — | Not dedicated endpoint | 🔲 |
| 1.16 | Compare page | `GET /compare/{id?}` | `GET /compare` | `POST /api/v1/projects/compare` + **localStorage** | ✅ |
| 1.17 | Compare list POST | `POST /compare` | — | Client-side list | 🟡 |
| 1.18 | Filter compare POST | `POST /filter-compare-projects` | — | `/api/v1/proxy` possible | 🟡 |
| 1.19 | Compare-2 page | `GET /compare-2/{id?}` | `GET /compare-2` | `POST /api/v1/projects/by-ids` — **DB** | ✅ |
| 1.20 | Compare-2 types | `GET /gettypes/{id?}` | — | Not native | 🔲 |
| 1.21 | Compare-2 project data | `POST /get_project_compare` | — | `/api/v1/proxy` | 🟡 |
| 1.22 | Add to wishlist | `GET /add-wishlist/{id}` (auth) | — | `POST /api/v1/wishlist` — partial | 🟡 |
| 1.23 | Wishlist page | `GET /user/wishlist` | `GET /account/wishlist` | `GET/POST/DELETE /api/v1/wishlist` | 🟡 |
| 1.24 | Delete wishlist item | `GET /user/wishlist/{item}/delete` | Account page | `DELETE /api/v1/wishlist` | 🟡 |
| 1.25 | Blog index | `GET /blogs` | `GET /blog` | `blog.service` — **DB** or mock | ✅ |
| 1.26 | Blog article | `GET /{category}/{slug}` | `GET /blog/[category]/[slug]` | **DB** or mock | ✅ |
| 1.27 | About us | `GET /about-us` | `GET /about-us` | Static + link to legacy | ✅ |
| 1.28 | Terms | `GET /terms-conditions` | `GET /terms-conditions` | Static + link to legacy | ✅ |
| 1.29 | Contact form page | `GET /contact-us` | `GET /contact` | `POST /api/v1/contact` | ✅ |
| 1.30 | Contact submit | `POST /contact` | Contact page | `POST /api/v1/contact` | ✅ |
| 1.31 | Sitemap | `GET /sitemap.xml` | `GET /sitemap.xml` | Static routes in `sitemap.ts` | ✅ |
| 1.32 | Interest form | `POST /submit-interest` | — | `POST /api/v1/interest` | ✅ |
| 1.33 | Custom activity log | `POST /create/custom-activity-log` | — | Not built | 🔲 |
| 1.34 | Areas helper | `GET /areas` | — | `GET /api/v1/meta/areas` | ✅ |

---

## 2. Authentication & user account

| # | Legacy function | Legacy route / method | v2 route / page | v2 API / integration | Status |
|---|-----------------|----------------------|-----------------|----------------------|--------|
| 2.1 | Login page | `GET /login` | `GET /login` | — | ✅ |
| 2.2 | Login submit (web) | `POST /login` | Login form | `POST /api/v1/auth/login` — **DB** + legacy fallback | ✅ |
| 2.3 | Web login API | `POST /web/login` | — | Same as 2.2 | 🟡 |
| 2.4 | Web logout | `GET /web/logout` | — | `POST /api/v1/auth/logout` | ✅ |
| 2.5 | Register page | — | `GET /register` | — | 🟡 |
| 2.6 | Register web user | `POST /register-web-user` | Register form | `POST /api/v1/auth/register` — stub | 🟡 |
| 2.7 | Submit phone (register) | `POST /submit-web-user-phone-no` | — | Part of register flow | 🟡 |
| 2.8 | Resend OTP | `POST /resend-phone-no-otp` | — | `POST /api/v1/auth/otp` — stub | 🟡 |
| 2.9 | Verify OTP | `POST /verify-phone-no-otp` | — | `POST /api/v1/auth/otp` — stub | 🟡 |
| 2.10 | Google OAuth | `GET auth/google`, callback | Link to legacy | `https://dev.abadraho.com/auth/google` | 🟡 |
| 2.11 | Facebook OAuth | `GET auth/facebook`, callback | Link to legacy | Legacy URL | 🟡 |
| 2.12 | Facebook login (alt) | `GET facebook/login` | — | Legacy | 🟡 |
| 2.13 | Email verify notice | `GET /email/verify` | `GET /verify-email` | Link to legacy resend | 🟡 |
| 2.14 | Email verify link | `GET /email/verify/{id}/{hash}` | — | Legacy only | 🔲 |
| 2.15 | Resend verification | `GET email/resend` | Verify-email page | Legacy link | 🟡 |
| 2.16 | Profile page | `GET /profilepage`, `/profile` | `GET /account/profile` | `GET /api/v1/auth/me` | 🟡 |
| 2.17 | Update profile | `POST /my-profile-update` | — | Not native POST | 🔲 |
| 2.18 | Change password | `POST /my-profile-update-password` | `GET /account/password` | Legacy links | 🟡 |
| 2.19 | Reset password request | `GET/POST /reset-password` | `GET /reset-password` | Legacy link | 🟡 |
| 2.20 | Reset with token | `GET/POST /change-password/{token}` | — | Legacy only | 🔲 |
| 2.21 | Save phone on login | `POST /user/phone_number` | — | `/api/v1/proxy` | 🟡 |
| 2.22 | Requested session URL | `POST /requested-session-url` | — | Not built | 🔲 |
| 2.23 | Add rating (public) | `POST add-rating` | Project page | `POST /api/v1/reviews` — needs legacy session | 🟡 |

---

## 3. Project detail (sub-features)

| # | Legacy function | Legacy route / method | v2 | Integration | Status |
|---|-----------------|----------------------|-----|-------------|--------|
| 3.1 | Project detail view | `GET /project/{slug}` | `/project/[slug]` | DB + legacy API | ✅ |
| 3.2 | Units & pricing table | Blade partial | `UnitsTable` component | **DB** units | ✅ |
| 3.3 | Inquiry / Zoho lead | `POST web/project-detail/inquiry` | `InquiryForm` | `POST /api/v1/inquiries` | ✅ |
| 3.4 | Payment calculator UI | `POST /projects/payment-schedule` | `PaymentCalculator` | `POST /api/v1/payment-schedule` | ✅ |
| 3.5 | Reviews display | Blade | `ReviewsSection` | **DB** reviews if present | 🟡 |
| 3.6 | Add review | `POST add-rating` | Reviews section | `POST /api/v1/reviews` | 🟡 |
| 3.7 | Voucher generate | `POST /projects/generate-voucher` | `VoucherButton` | `POST /api/v1/vouchers/generate` | 🟡 |
| 3.8 | Similar projects | API `projects/similar` | Detail page block | Legacy API in detail service | 🟡 |
| 3.9 | Recent views | Session | — | Not built | 🔲 |

---

## 4. Broker portal

| # | Legacy function | Legacy route / method | v2 route / page | v2 integration | Status |
|---|-----------------|----------------------|-----------------|----------------|--------|
| 4.1 | Broker dashboard | `GET /broker-dashboard` | `GET /broker` | Hub + legacy links | 🟡 |
| 4.2 | Broker projects | `GET /broker/projects` | `GET /broker/projects` | Legacy link page | 🟡 |
| 4.3 | Broker analytics | `GET /broker/analytics` | `GET /broker/analytics` | Legacy link page | 🟡 |
| 4.4 | Pitch decks list | `GET /broker/pitch-decks` | `GET /broker/pitch-decks` | Legacy link | 🟡 |
| 4.5 | Generate pitch deck | `GET /broker/pitch-deck/generate/{project}` | — | Legacy only | 🔲 |
| 4.6 | Show / download pitch deck | `GET /broker/pitch-deck/{id}` | — | Legacy only | 🔲 |
| 4.7 | Regenerate pitch deck | `POST /broker/pitch-deck/{id}/regenerate` | — | Legacy only | 🔲 |
| 4.8 | WhatsApp cards list | `GET /broker/whatsapp-cards` | `GET /broker/whatsapp-cards` | Legacy link | 🟡 |
| 4.9 | Generate WhatsApp card | `GET /broker/whatsapp-card/generate/{project}` | — | Legacy only | 🔲 |
| 4.10 | Share WhatsApp card | `POST /broker/whatsapp-card/{id}/share` | — | Legacy only | 🔲 |
| 4.11 | Short link redirect | `GET /p/{slug}/{shortCode}` | `GET /p/[slug]/[code]` | Redirect logic | ✅ |

---

## 5. Admin panel (web)

| # | Legacy function | Legacy path | v2 admin path | v2 integration | Status |
|---|-----------------|-------------|---------------|----------------|--------|
| 5.1 | Admin login | `GET/POST /admin/login` | `/admin/login` | `POST /api/admin/auth/login` — **DB** | ✅ |
| 5.2 | Admin register | `GET/POST /admin/register` | — | Not in v2 | 🔲 |
| 5.3 | Admin logout | `GET /admin/logout` | — | `POST /api/admin/auth/logout` | ✅ |
| 5.4 | Dashboard | `GET /admin/dashboard` | `/admin/dashboard` | `GET /api/admin/stats` — **DB** | ✅ |
| 5.5 | Admin profile | `GET /admin/admin-profile` | `/admin/profile` | Legacy fallback page | 🟡 |
| 5.6 | Admin change password | `GET/POST admin-change-password` | Profile | Legacy fallback | 🟡 |
| 5.7 | Activity log | `GET /admin/activity-log` | `/admin/activity-log` | Legacy fallback only | 🟡 |
| 5.8 | Projects CRUD | `admin/project` resource | `/admin/projects` | Native CRUD — **DB** | ✅ |
| 5.9 | Pending projects | `admin/pending/project` | `/admin/projects/pending` | Native list filter `status=0` | ✅ |
| 5.10 | Active projects | `admin/active/project` | `/admin/projects/active` | Native list filter `status=1` | ✅ |
| 5.11 | Project amenities bulk | `POST project/update/amenities` | — | Legacy only | 🔲 |
| 5.12 | Project utilities bulk | `POST project/update/utilities` | — | Legacy only | 🔲 |
| 5.13 | Units CRUD | `admin/unit` resource | `/admin/units` | Native CRUD — **DB** | ✅ |
| 5.14 | Unit delete | `POST admin/unit/{id}/delete` | Admin units | Native delete | ✅ |
| 5.15 | Unit rooms create/update | `POST admin/unit/{id}/room` | — | Legacy only | 🔲 |
| 5.16 | Areas CRUD | `admin/area` resource | `/admin/areas` | Native CRUD — **DB** | ✅ |
| 5.17 | Project types CRUD | `admin/project_type` | `/admin/project-types` | Native CRUD — **DB** | ✅ |
| 5.18 | Progress CRUD | `admin/progress` | `/admin/progress` | Native CRUD — **DB** | ✅ |
| 5.19 | Builders CRUD | `admin/builder` | `/admin/builders` | Native CRUD — **DB** | ✅ |
| 5.20 | Users manage | `admin/manage_users` | `/admin/users` | Native list/edit — **DB** (86 users) | ✅ |
| 5.21 | User create/delete | `admin/add-new-user`, delete | — | Legacy only | 🔲 |
| 5.22 | Agents / brokers | `admin/agents` | `/admin/agents` | Native list — **DB** | ✅ |
| 5.23 | Agent full CRUD | agents create/edit/show | — | Legacy only | 🔲 |
| 5.24 | Inquiries (Zoho) | `admin/listing` | `/admin/inquiries` | Native CRUD — **DB** | ✅ |
| 5.25 | Inquiry export Excel | `GET /admin/export/listing` | — | Legacy only | 🔲 |
| 5.26 | Search history | `admin/search-history` | `/admin/search-history` | Native list — **DB** | ✅ |
| 5.27 | Housing calc search history | `admin/housing-calc-search-history` | — | Legacy only | 🔲 |
| 5.28 | Advance search history | `admin/advance-search-history` | — | Legacy only | 🔲 |
| 5.29 | Search history export | `admin/searchHistory/export` | — | Legacy only | 🔲 |
| 5.30 | Vouchers | `admin/voucher` | `/admin/vouchers` | Legacy fallback only | 🟡 |
| 5.31 | Downloaded vouchers | `admin/downloaded-voucher` | — | Legacy only | 🔲 |
| 5.32 | Blogs CRUD | `admin/blog` | `/admin/blogs` | Native CRUD — **DB** | ✅ |
| 5.33 | Blog categories | `admin/blog_category` | `/admin/blog-categories` | Native CRUD — **DB** | ✅ |
| 5.34 | Tags | `admin/tag` | `/admin/tags` | Legacy fallback only | 🟡 |
| 5.35 | Room types | `admin/room_type` | `/admin/room-types` | Legacy fallback only | 🟡 |
| 5.36 | Amenities | `admin/amenities` | `/admin/amenities` | Legacy fallback only | 🟡 |
| 5.37 | Utilities | `admin/utilities` | `/admin/utilities` | Legacy fallback only | 🟡 |
| 5.38 | Payment schedules | `admin/payment-schedules` | `/admin/payment-schedules` | Legacy fallback only | 🟡 |
| 5.39 | Reviews admin | `GET admin/reviews` | `/admin/reviews` | Native CRUD — **DB** | ✅ |
| 5.40 | Teams | `admin/my-teams`, `admin/teams` | `/admin/teams` | Legacy fallback only | 🟡 |
| 5.41 | Contact messages | `admin/contact` | `/admin/contact` | Native CRUD — **DB** | ✅ |
| 5.42 | Contact export | `admin/export/contact` | — | Legacy only | 🔲 |
| 5.43 | Customers | `GET /admin/cutomers` | `/admin/customers` | Legacy fallback only | 🟡 |
| 5.44 | Favorites | `GET /admin/favorites` | `/admin/favorites` | Native wishlists — **DB** | ✅ |
| 5.45 | CSV import projects | `POST /admin/project/import` | `/admin/import` | Legacy fallback only | 🟡 |
| 5.46 | CSV import areas/units/types | `import-*` routes | Import page | Legacy fallback only | 🟡 |
| 5.47 | Admin forbidden | `GET /admin-forbidden` | — | Not built | 🔲 |

---

## 6. Public / mobile API (`routes/api.php` → base `/api/`)

Legacy base: `https://dev.abadraho.com/api/`  
v2 base: `http://localhost:3000/api/v1/`

| # | Legacy endpoint | Method | v2 endpoint | Integration | Status |
|---|-----------------|--------|-------------|-------------|--------|
| 6.1 | `/api/user` (auth) | GET | — | Not exposed | 🔲 |
| 6.2 | `/api/all` | GET | — | Use `/api/v1/projects` instead | 🟡 |
| 6.3 | `/api/filter` | POST | — | `/api/v1/proxy/api/filter` | 🟡 |
| 6.4 | `/api/projects/all-areas` | GET | `GET /api/v1/meta/areas` | Native or legacy fetch | ✅ |
| 6.5 | `/api/projects/all-types` | GET | `GET /api/v1/meta/types` | Legacy proxy JSON | ✅ |
| 6.6 | `/api/projects/type` | POST | — | Proxy | 🟡 |
| 6.7 | `/api/projects/all` | GET | `GET /api/v1/projects` | **DB** + legacy fallback | ✅ |
| 6.8 | `/api/projects/filter` | POST | `POST /api/v1/projects/filter` | **Legacy proxy** | 🟡 |
| 6.9 | `/api/projects/show` | POST | — | Detail via page/server; proxy possible | 🟡 |
| 6.10 | `/api/projects/all-units` | GET | — | Not dedicated | 🔲 |
| 6.11 | `/api/projects/compare` | POST | `POST /api/v1/projects/compare` | **DB** | ✅ |
| 6.12 | `/api/projects/area` | POST | — | Proxy | 🟡 |
| 6.13 | `/api/projects/unit` | POST | — | Proxy | 🟡 |
| 6.14 | `/api/projects/similar` | POST | — | Legacy in detail service | 🟡 |
| 6.15 | `/api/projects/unit-measurement` | POST | — | Not built | 🔲 |
| 6.16 | `/api/search` | POST | `POST /api/v1/search-history` | Stub/store | 🟡 |
| 6.17 | `/api/login` | POST | `POST /api/v1/auth/login` | **DB** + legacy | ✅ |
| 6.18 | `/api/user-details` | POST | `GET /api/v1/auth/me` | Partial | 🟡 |
| 6.19 | `/api/update-phone` | POST | — | Proxy | 🟡 |
| 6.20 | `/api/user-exists` | POST | — | Not built | 🔲 |
| 6.21 | `/api/register` | POST | `POST /api/v1/auth/register` | Stub | 🟡 |
| 6.22 | `/api/zohoForm` | POST | `POST /api/v1/inquiries` | Native + legacy forward | ✅ |
| 6.23 | `/api/unit-types` | POST | — | Not built | 🔲 |

---

## 7. Builder / mobile admin API (`/api/admin/`)

| # | Legacy endpoint | Method | v2 | Status |
|---|-----------------|--------|-----|--------|
| 7.1 | `/api/admin/project` (resource) | GET/POST/PUT | `/api/v1/proxy/api/admin/project` | 🟡 |
| 7.2 | `/api/admin/project/{slug}` | GET | Proxy | 🟡 |
| 7.3 | `/api/admin/project/unit/store` | POST | Proxy | 🟡 |
| 7.4 | `/api/admin/unit/{id}` | GET | Proxy | 🟡 |
| 7.5 | `/api/admin/unit/{unit}/room` | POST | Proxy | 🟡 |
| 7.6 | `/api/admin/unit/{unit}/room/{room}` | POST | Proxy | 🟡 |
| 7.7 | `/api/admin/my-teams` | GET | Not built | 🔲 |
| 7.8 | `/api/admin/joined-teams` | GET | Not built | 🔲 |
| 7.9 | `/api/admin/team/create` | GET | Not built | 🔲 |
| 7.10 | `/api/admin/team/store` | POST | Not built | 🔲 |
| 7.11 | `/api/admin/team/{slug}` | GET | Not built | 🔲 |

---

## 8. v2-only API summary (complete list)

All routes under `http://localhost:3000`:

### Public ` /api/v1/* `

| Endpoint | Methods | Purpose | Data source |
|----------|---------|---------|-------------|
| `/api/v1/projects` | GET | List projects (filters, pagination) | DB / legacy / mock |
| `/api/v1/projects/map-data` | GET | Map markers + coordinates | DB |
| `/api/v1/projects/compare` | POST | Compare by IDs | DB |
| `/api/v1/projects/by-ids` | POST | Fetch projects by ID list | DB |
| `/api/v1/projects/filter` | POST | Advanced filter | Legacy proxy |
| `/api/v1/off-plan/filter` | GET/POST | Off-plan filter | Legacy proxy |
| `/api/v1/meta/areas` | GET | Area list | DB / legacy |
| `/api/v1/meta/types` | GET | Project types | Legacy proxy |
| `/api/v1/meta/filters` | GET | Filter dropdown options (builders, types, status) | DB |
| `/api/v1/auth/login` | POST | User login | DB + legacy |
| `/api/v1/auth/logout` | POST | User logout | Cookie |
| `/api/v1/auth/register` | POST | Register | Stub |
| `/api/v1/auth/otp` | POST | OTP send/verify | Stub |
| `/api/v1/auth/me` | GET | Current user session | Cookie |
| `/api/v1/inquiries` | POST | Project inquiry / Zoho | DB + legacy |
| `/api/v1/contact` | POST | Contact form | Legacy forward |
| `/api/v1/interest` | POST | Interest form | Native |
| `/api/v1/reviews` | POST | Add review | Partial |
| `/api/v1/wishlist` | GET, POST, DELETE | Wishlist | DB partial |
| `/api/v1/payment-schedule` | POST | Payment calculator | Native logic |
| `/api/v1/vouchers/generate` | POST | Voucher | Legacy |
| `/api/v1/search-history` | POST | Save search | DB partial |
| `/api/v1/proxy/[...path]` | GET, POST | Generic legacy forward | `dev.abadraho.com` |

### Admin ` /api/admin/* `

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/admin/auth/login` | POST | Admin login |
| `/api/admin/auth/logout` | POST | Admin logout |
| `/api/admin/auth/me` | GET | Admin session |
| `/api/admin/stats` | GET | Dashboard counts |
| `/api/admin/{resource}` | GET, POST | List / create (projects, users, units, …) |
| `/api/admin/{resource}/{id}` | GET, PATCH, DELETE | Read / update / delete |

**Native admin resources:** `projects`, `units`, `areas`, `project-types`, `progress`, `builders`, `users`, `brokers` (agents), `inquiries`, `blogs`, `blog-categories`, `reviews`, `contact`, `search-history`, `wishlists` (favorites).

---

## 9. v2 pages summary (complete list)

| Path | Purpose |
|------|---------|
| `/` | Home / off-plan listings + map view |
| `/project/[slug]` | Project detail |
| `/compare`, `/compare-2` | Compare tools |
| `/blog`, `/blog/[category]/[slug]` | Blog |
| `/about-us`, `/terms-conditions`, `/contact` | Static |
| `/login`, `/register`, `/verify-email`, `/reset-password` | Auth |
| `/account/profile`, `/account/password`, `/account/wishlist` | Account |
| `/broker`, `/broker/projects`, `/broker/analytics`, `/broker/pitch-decks`, `/broker/whatsapp-cards` | Broker hub |
| `/p/[slug]/[code]` | Short links |
| `/off-plan`, `/projects`, `/projects/[slug]` | Redirects / aliases |
| `/download-pdf/[id]/[file]` | PDF download |
| `/admin/login`, `/admin/dashboard`, `/admin/[...]` | Admin panel |
| `/sitemap.xml` | SEO sitemap |

---

## 10. Dev / ops (not migrated)

| Legacy route | Reason |
|--------------|--------|
| `/config-cache`, `/clear-cache`, `/config-clear`, `/route-clear`, `/run` | Laravel maintenance |
| `sendbasicemail`, `sendhtmlemail`, `sendattachmentemail` | Test mail |

---

## 11. Integration scorecard

| Area | Legacy items (approx.) | ✅ Done | 🟡 Partial | 🔲 Missing |
|------|------------------------|---------|------------|------------|
| Public web | 34 | 18 | 12 | 4 |
| Auth & account | 23 | 5 | 14 | 4 |
| Project detail | 9 | 4 | 4 | 1 |
| Broker | 11 | 1 | 4 | 6 |
| Admin web | 47 | 22 | 14 | 11 |
| Public API | 23 | 6 | 14 | 3 |
| Builder API | 11 | 0 | 6 | 5 |
| **Total (tracked)** | **~158** | **~56 (35%)** | **~68 (43%)** | **~34 (22%)** |

*Percentages are approximate; some items are low priority (exports, dev routes).*

---

## 12. Recommended next integrations (priority)

1. **Auth:** Register + OTP + Google/Facebook native  
2. **Wishlist:** Full server sync when logged in  
3. **Compare-2:** `gettypes` + `get_project_compare` native APIs  
4. **Admin:** Vouchers, tags, amenities, utilities, teams (Prisma models)  
5. **Broker:** Pitch deck + WhatsApp card generation  
6. **API:** `projects/show`, `user-exists`, `unit-measurement`, builder teams  
7. **Profile:** `POST` update profile and password in v2  

---

*Related docs: `MIGRATION_STATUS.md`, `CHECKLIST.md`, `ARCHITECTURE.md`*
