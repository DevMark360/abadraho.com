# cPanel: dev.abadraho.com ko abadraho-v2 se replace karna

## Short answer

| Question | Answer |
|----------|--------|
| Kya data legacy Laravel se live aa raha hai? | **Nahi** (jab `USE_DATABASE=true`). Data **MySQL** se aata hai — wahi DB jo pehle Laravel use karta tha. |
| Kya poora folder replace kar sakte ho? | **Haan**, lekin sirf PHP copy se nahi — **Node.js app** chalani hogi + kuch cheezein alag migrate karni hain. |
| Laravel delete kar do? | Tab tak **nahi** jab tak uploads + mobile API + broker tools plan na ho. |

---

## v2 data kahan se aata hai

```
┌─────────────────┐     ┌──────────────────┐
│  abadraho-v2    │────▶│  MySQL (same DB)  │  ← PRIMARY (USE_DATABASE=true)
│  (Next.js)      │     │  markprop_dev_*   │
└────────┬────────┘     └──────────────────┘
         │
         │  fallback / images / kuch APIs (optional)
         ▼
┌─────────────────┐
│ dev.abadraho.com│  ← sirf jab LEGACY_* env set ho AUR Laravel ab bhi chal raha ho
│ Laravel API     │
└─────────────────┘
```

**Local par:** aapki `markprop_dev_abadraho.sql` import → v2 seedha DB read karta hai. Legacy site band ho to bhi listings/admin chal sakte hain **agar** DB + uploads theek hon.

---

## cPanel par replace — zaroori steps

### 1. Node.js (PHP ki jagah)

cPanel → **Setup Node.js Application**

- Application root: jahan `abadraho-v2` files hain  
- Startup: `npm run start` (pehle `npm run build`)  
- Node 20+  
- Domain: `dev.abadraho.com`

Laravel `public/index.php` wala flow **kaam nahi karega**.

### 2. MySQL (same database)

Production `.env`:

```env
USE_DATABASE=true
DATABASE_URL="mysql://USER:PASS@localhost:3306/markprop_dev"
# ya jo bhi production DB name ho

NEXT_PUBLIC_APP_URL=https://dev.abadraho.com
AUTH_URL=https://dev.abadraho.com
AUTH_SECRET=<stable secret>
```

**Laravel `.env` se copy:** `DB_*`, `MAIL_*`, `GOOGLE_*`, `FACEBOOK_*`, `MAPBOX_*`

### 3. Uploads / images (bahut zaroori)

Abhi images ke URLs legacy paths use karte hain, masalan:

`/uploads/project_images/...`, `/assets/...`

**Purane server se copy karo** (Laravel `public/` se):

| Purana path | v2 par rakhein |
|-------------|----------------|
| `public/uploads/` | `abadraho-v2/public/uploads/` |
| `public/assets/` | `abadraho-v2/public/assets/` |
| `storage/app/public` (agar linked) | check symlink |

Phir `.env`:

```env
NEXT_PUBLIC_LEGACY_SITE_URL=https://dev.abadraho.com
```

(Same domain — images isi site se load hongi.)

### 4. Legacy env after full replace

Jab Laravel **hat jaye**, ye mat karo:

```env
LEGACY_API_URL=https://dev.abadraho.com/api   # ❌ Laravel API ab nahi hai
```

**Karo:**

```env
USE_DATABASE=true
NEXT_PUBLIC_LEGACY_SITE_URL=https://dev.abadraho.com
# LEGACY_API_URL hata do ya khali — fallback API use na ho
```

### 5. Build & start

```bash
npm ci
npx prisma generate
npm run build
npm run start
```

---

## Replace ke baad kya break ho sakta hai

| Area | Risk | Abhi v2 mein |
|------|------|----------------|
| Listings + map + detail | Low | DB se (~85–95%) |
| Admin lists / CRUD | Low | Native admin |
| Project images | **High** agar uploads copy na karo | `legacyAssetUrl` |
| Admin “Full editor” iframe | Medium | Complex forms ab bhi legacy UI maangte hain — native editor baad mein |
| **Mobile app** `/api/*` | **High** | Laravel API chahiye — alag subdomain ya API migrate |
| **Broker** pitch decks / WhatsApp | **High** | Abhi legacy links |
| OAuth callbacks | Medium | `.env` + Google/Facebook console URLs update |
| Zoho inquiry | Medium | Native + legacy fallback mix |
| PDF download | Medium | Kuch routes legacy proxy |
| `wishlists` table | Low | Aapki dump mein table missing ho to wishlist empty |

---

## Recommended migration (safe)

1. **Pehle:** v2 alag subdomain par test karo, e.g. `v2.dev.abadraho.com` — same production DB read-only ya copy.  
2. **Uploads** copy + images verify.  
3. **Admin + listings** test.  
4. Phir `dev.abadraho.com` DNS/document root Node app par point karo.  
5. Laravel ko backup rakho; mobile API ke liye `api.dev.abadraho.com` par purana code optional rakho.

---

## Checklist before delete Laravel folder

- [ ] `USE_DATABASE=true` production par  
- [ ] `npm run build` success  
- [ ] Home, map, project detail, admin login tested  
- [ ] Images load (uploads copied)  
- [ ] Mail / OTP / OAuth env set  
- [ ] Mobile app plan (keep old API or migrate)  
- [ ] Broker tools plan  
- [ ] Full DB backup

---

## Commands (server)

```bash
npm run sync:legacy-env   # optional: copy MAIL/OAUTH from old .env
npm run db:verify         # projects/users count
```
