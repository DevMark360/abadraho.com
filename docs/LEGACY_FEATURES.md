# dev.abadraho.com → abadraho-v2 feature parity

| Legacy | v2 | Status |
|--------|-----|--------|
| `/` home / off-plan listings | `/` card grid + filters | ✅ |
| `/project/{slug}` | `/project/[slug]` units, inquiry, payment calc | 🟡 |
| `/projects`, `/projects/listings` | `/` (redirect `/projects`) | ✅ |
| `/off-plan` + map | `/off-plan` → `/` (map planned) | 🟡 |
| Compare `/compare`, `/compare-2` | `/compare` + card actions | 🟡 |
| Wishlist | `/account/wishlist` + heart on cards | 🟡 (local; auth sync planned) |
| `/blogs` | `/blog` | 🔲 |
| Login / register / OAuth / OTP | `/login` | 🔲 |
| `/profilepage` | `/account/profile` | 🔲 |
| `/contact-us` | `/contact` + API proxy | 🟡 |
| `/broker/*` pitch decks, WhatsApp | `/broker` | 🔲 |
| `/p/{slug}/{code}` short links | `/p/[slug]/[code]` | 🔲 |
| `/admin/*` full panel | `/admin` hub | 🔲 |
| `/api/*` mobile API | `/api/v1/*` | 🟡 |
| Zoho inquiry | `/api/v1/inquiries` | 🟡 |
| Payment schedule | `/api/v1/payment-schedule` | 🟡 |
| Vouchers, PDF download | project detail | 🔲 |
| Reviews / ratings | project detail | 🔲 |
| Housing calculator | listings | 🔲 |

✅ done · 🟡 partial (via legacy API or local) · 🔲 planned

Data flows through **legacy Laravel API** when MySQL is offline on your machine.
