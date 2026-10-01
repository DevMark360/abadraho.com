# Phase 0 — Foundation (complete)

**Goal:** Database schema aligned with legacy MySQL, admin CRUD wired for all core models, legacy proxy verified, health check in place.

## Checklist

| # | Task | Status |
|---|------|--------|
| 0.1 | Prisma schema — all legacy tables mapped | ✅ |
| 0.2 | Models: voucher, tag, amenity, utility, roomType, roomTypeUnit, team, paymentSchedule, activityLog, customer | ✅ |
| 0.3 | `USE_DATABASE=true` + `DATABASE_URL` documented | ✅ |
| 0.4 | Legacy proxy `/api/v1/proxy/*` + smoke tests | ✅ |
| 0.5 | Admin native CRUD for Phase 0 models | ✅ |
| 0.6 | Foundation health API + CLI script | ✅ |

## Verify locally

```powershell
cd e:\abadraho-v2
npm install
npx prisma generate
npm run foundation:check
```

Or hit: http://localhost:3000/api/v1/health

## Expected output

- **DB:** `projects` count > 0 (after SQL import)
- **Proxy:** legacy API + off-plan map-data return 200
- **Overall:** `passed: true`

## Schema notes

| Legacy table | Prisma model |
|--------------|--------------|
| `blog` / `blog_category` | `Blog` / `BlogCategory` |
| `contactus` | `ContactUs` |
| `room_type_unit` | `RoomTypeUnit` (was wrongly `unit_rooms`) |
| `brokers` | `Broker` (optional on old dumps; agents use `userTypeId = -10027`) |
| `user_search_history` | `UserSearchHistory` |
| `activity_log` | `ActivityLog` |
| `user_voucher` | `UserVoucher` |
| Customers | `User` with `userTypeId = -10024` |

Proxy audit: `docs/PHASE0_PROXY_AUDIT.md` (from `npm run foundation:check`)

## Next phase

→ **Phase 1 — Authentication** (register, OTP, OAuth, profile/password)

See `docs/MIGRATION_STATUS.md` for full migration tracker.
