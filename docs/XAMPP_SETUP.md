# XAMPP + MySQL setup (local dev)

## What we did

1. XAMPP MySQL on port **3306** (running)
2. Database **`markprop_dev`** + user **`markprop_usrDev`** (same as Laravel `.env`)
3. Prisma tables created: `npx prisma db push`
4. **`abadraho-v2/.env`**: `USE_DATABASE=true`
5. Local admin user seeded for v2 admin login

## Admin login (v2)

| Field | Value |
|-------|--------|
| URL | http://localhost:3000/admin/login |
| Email | `devmarkprop@gmail.com` |
| Password | whatever you set in `SEED_ADMIN_PASSWORD` (required) |

To use your own password:

```powershell
cd e:\abadraho-v2
$env:SEED_ADMIN_PASSWORD="YourPassword"
node scripts/seed-admin.mjs
```

## Important: data in codebase vs live site

| Source | What it contains |
|--------|------------------|
| `e:\dev.abadraho.com\.env` | DB credentials |
| `Scripts/script.sql` | Old **patches** (ALTER/INSERT), not full database |
| **Git repo** | No full production dump |
| **dev.abadraho.com server** | Real projects, users, images |

So:

- **Schema** → from Prisma (`db push`) ✅
- **Projects/users** → empty locally until you **import a dump** from server, OR listings use **legacy API** fallback

### Import full data from server

File: `markprop_dev_abadraho.sql` (from dev.abadraho.com)

```powershell
# Default path: Downloads\markprop_dev_abadraho.sql
powershell -ExecutionPolicy Bypass -File e:\abadraho-v2\scripts\import-sql-dump.ps1
```

`.env` database name: **`markprop_dev_abadraho`** (not `markprop_dev`).

After import: **79 projects** (verify with phpMyAdmin). Restart `npm run dev`.

## Commands

```powershell
# 1. Start MySQL in XAMPP Control Panel

# 2. One-time DB user (already run if setup script succeeded)
powershell -ExecutionPolicy Bypass -File scripts/setup-xampp-db.ps1

# 3. Sync tables
cd e:\abadraho-v2
npx prisma db push

# 4. Admin user
node scripts/seed-admin.mjs

# 5. App
npm run dev
```

## Laravel (optional, same DB)

Point `e:\dev.abadraho.com\.env` to same `127.0.0.1` / `markprop_dev` and run:

```bash
php artisan migrate
```

(Only if you use Laravel locally; v2 uses Prisma.)
