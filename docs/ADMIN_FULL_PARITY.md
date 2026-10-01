# Admin — full legacy parity in abadraho-v2

## Same data as dev.abadraho.com

1. Put your SQL dump in `abadraho-v2/data/markprop_dev_abadraho.sql`
2. Import:

```powershell
cd e:\abadraho-v2
npm run db:import
```

3. `.env`:

```env
USE_DATABASE=true
DATABASE_URL="mysql://markprop_usrDev:PASSWORD@127.0.0.1:3306/markprop_dev_abadraho"
```

4. Verify:

```powershell
npm run db:verify
```

5. Login: `https://dev.abadraho.com/admin/login` with **same email/password** as legacy (`users` staff or `admins` table).

## How v2 matches legacy workflow

| Legacy | v2 |
|--------|-----|
| Grouped sidebar | Same groups in dark sidebar |
| List / edit records | Native CRUD on all modules |
| Project images, amenities bulk, CSV import | **Full editor** → `/admin/legacy/project/{id}/edit` (iframe + new tab) |
| Excel export inquiries | Sidebar links → legacy export URLs |
| Builder limited menu | Auto when `user_type_id = -10025` |

## URLs

- Native modules: `/admin/projects`, `/admin/users`, …
- Legacy UI inside v2 shell: `/admin/legacy/project`, `/admin/legacy/manage_users`, …
- Public site unchanged: `/`, `/project/[slug]`, …

## What still uses legacy UI (by design)

Complex screens that need file uploads and multi-step Laravel forms open in **Legacy UI** (same database, changes visible in v2 lists):

- Project full edit (media, amenities, utilities)
- CSV import
- Some Excel exports

Everything else is native v2 with your imported MySQL data.
