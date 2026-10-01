# AbadRaho v2 — Complete migration checklist (dev.abadraho.com)



Legend: ✅ Done · 🟡 Partial · 🔲 Not started · ⏭ Dev-only (skip in v2)



**Target:** Every user-facing & admin feature from Laravel — routes exist in v2; native CRUD where noted.



---



## A. Public website — listings & search



| # | Legacy route / feature | v2 route | Status |

|---|------------------------|----------|--------|

| A1 | Home `/` | `/` | ✅ |

| A2 | Off-plan `/off-plan` | `/` + `?view=map` | ✅ |

| A3 | Off-plan map data | `/api/v1/projects/map-data` | ✅ |

| A4 | Off-plan filter AJAX | `/api/v1/off-plan/filter` | ✅ |

| A5 | Projects listings | `/projects` → `/` | ✅ |

| A6 | Project filter GET/POST | `/api/v1/projects/filter` | ✅ |

| A7 | Search listings POST | filter chips + `?q=` | 🟡 |

| A8 | Slug listing `/projects/{slug}` | `/projects/[slug]` → `/project/[slug]` | ✅ |

| A9 | Housing calculator | Filter sidebar + `/api/v1/search-history` | ✅ |

| A10 | Reelly UI (sidebar, chips, split map) | AppShell | ✅ |



## B. Project detail



| # | Legacy | v2 | Status |

|---|--------|-----|--------|

| B1 | Detail `/project/{slug}` | `/project/[slug]` | ✅ |

| B2 | Units & rooms | UnitsTable | ✅ |

| B3 | Inquiry / Zoho | InquiryForm + API | ✅ |

| B4 | Payment schedule | PaymentCalculator + API | ✅ |

| B5 | Reviews display + add rating | ReviewsSection + API | 🟡 |

| B6 | Generate voucher | VoucherButton + API | 🟡 |

| B7 | Download PDF | `/download-pdf/[id]/[file]` | ✅ |

| B8 | Similar projects | detail page | 🟡 |

| B9 | Activity log (client) | proxy via legacy | 🟡 |

| B10 | Recent views | session/API | 🔲 |



## C. Compare



| # | Legacy | v2 | Status |

|---|--------|-----|--------|

| C1 | `/compare` | `/compare` | ✅ |

| C2 | `/compare-2` advanced | `/compare-2` | ✅ |

| C3 | Filter compare POST | API proxy | 🟡 |

| C4 | gettypes, get_project_compare | `/api/v1/proxy` | 🟡 |



## D. Wishlist & saved



| # | Legacy | v2 | Status |

|---|--------|-----|--------|

| D1 | `/add-wishlist/{id}` | `/api/v1/wishlist` POST | 🟡 |

| D2 | `/user/wishlist` | `/account/wishlist` | 🟡 |

| D3 | Delete wishlist item | API DELETE | 🟡 |



## E. Authentication & account



| # | Legacy | v2 | Status |

|---|--------|-----|--------|

| E1 | Login page + POST | `/login` | ✅ |

| E2 | Web login API | `/api/v1/auth/login` | ✅ |

| E3 | Logout | `/api/v1/auth/logout` | ✅ |

| E4 | Register + phone | `/register` | 🟡 |

| E5 | Phone OTP | `/api/v1/auth/otp` | 🟡 |

| E6 | Google OAuth | legacy link | 🟡 |

| E7 | Facebook OAuth | legacy link | 🟡 |

| E8 | Email verify | `/verify-email` | 🟡 |

| E9 | Profile | `/account/profile` | ✅ |

| E10 | Update profile | API proxy | 🔲 |

| E11 | Change password | `/account/password` | 🟡 |

| E12 | Reset password | `/reset-password` | 🟡 |

| E13 | Save phone | API proxy | 🔲 |

| E14 | Interest form POST | `/api/v1/interest` | ✅ |



## F. Blog & static pages



| # | Legacy | v2 | Status |

|---|--------|-----|--------|

| F1 | `/blogs` | `/blog` | ✅ |

| F2 | `/{category}/{slug}` | `/blog/[category]/[slug]` | ✅ |

| F3 | About us | `/about-us` | ✅ |

| F4 | Terms & conditions | `/terms-conditions` | ✅ |

| F5 | Contact us | `/contact` | ✅ |

| F6 | Sitemap.xml | `/sitemap.xml` | ✅ |



## G. Broker / agent



| # | Legacy | v2 | Status |

|---|--------|-----|--------|

| G1 | Broker dashboard | `/broker` | ✅ |

| G2 | Broker projects | `/broker/projects` | 🟡 |

| G3 | Analytics | `/broker/analytics` | 🟡 |

| G4 | Pitch decks CRUD | `/broker/pitch-decks` | 🟡 |

| G5 | WhatsApp cards CRUD | `/broker/whatsapp-cards` | 🟡 |

| G6 | Short link `/p/{slug}/{code}` | `/p/[slug]/[code]` | ✅ |



## H. Admin panel (full)



| # | Legacy | v2 | Status |

|---|--------|-----|--------|

| H1 | Admin login | `/admin/login` + API | ✅ |
| H2 | Dashboard + stats | `/admin/dashboard` | ✅ |
| H3–H23 | Core modules (projects, units, users, blogs, …) | Native CRUD | ✅ |
| H12–H15, H19–H22 | Vouchers, tags, amenities, teams, import | Legacy fallback | 🟡 |



## I. Mobile / public API (`/api/*`)



| # | Legacy | v2 | Status |

|---|--------|-----|--------|

| I1 | projects/* | `/api/v1/projects/*` | 🟡 |

| I2 | areas, types | `/api/v1/meta/*` | ✅ |

| I3 | compare, similar | compare + by-ids | 🟡 |

| I4 | login, register | `/api/v1/auth/*` | 🟡 |

| I5 | zohoForm | `/api/v1/inquiries` | ✅ |

| I6 | search history | `/api/v1/search-history` | ✅ |

| I7 | Builder API | `/api/v1/proxy` | 🟡 |



## J. Dev / ops



| # | Feature | Status |

|---|---------|--------|

| J1 | Artisan cache/migrate | ⏭ |

| J2 | Test mail | ⏭ |



---



## Implementation order (sprints)



1. **Sprint 1** — ✅ Legacy proxy + Auth + Account + Static  

2. **Sprint 2** — ✅ Project detail (reviews, voucher, PDF) + Compare-2 + Filters  

3. **Sprint 3** — ✅ Blog + Housing calc + Interest + Wishlist API  

4. **Sprint 4** — 🟡 Broker portal (hub + legacy bridges)  

5. **Sprint 5** — 🟡 Admin shell (all modules linked)  

6. **Sprint 6** — 🔲 Native admin CRUD + full DB + OAuth in v2  



---



*Registry: `src/config/features.ts`*

