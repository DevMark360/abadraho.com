# Phase 1 — Authentication & User Account

**Goal:** User, Broker, Builder, and Admin roles authenticate on v2 without legacy redirects.

## Checklist

| # | Task | v2 route / API | Status |
|---|------|----------------|--------|
| 1.1 | Login / logout (session cookie) | `POST /api/v1/auth/login`, `logout`, `me` | ✅ |
| 1.2 | Register | `POST /api/v1/auth/register`, `/register` | ✅ |
| 1.3 | Phone OTP submit / resend / verify | `POST /api/v1/auth/otp` | ✅ |
| 1.4 | Email verify + resend | `GET/POST /api/v1/auth/email`, `/verify-email` | ✅ |
| 1.5 | Password reset | `POST /api/v1/auth/password`, `/reset-password`, `/change-password/[token]` | ✅ |
| 1.6 | Profile update | `PATCH /api/v1/auth/profile`, `/account/profile` | ✅ |
| 1.7 | Password change | `POST /api/v1/auth/password` action `change` | ✅ |
| 1.8 | Google OAuth | `/api/v1/auth/google` + callback | ✅ (needs env) |
| 1.9 | Facebook OAuth | `/api/v1/auth/facebook` + callback | ✅ (needs env) |
| 1.10 | Role middleware | `middleware.ts` — `/account/*`, `/broker/*` | ✅ |
| 1.11 | Session URL + phone | `POST /api/v1/auth/session-url`, `/api/v1/auth/phone` | ✅ |

**Admin panel** remains separate (`abadraho_admin_session`) — not Phase 1 user auth.

## Env (same as dev.abadraho.com)

Copy from Laravel `.env` automatically:

```powershell
cd e:\abadraho-v2
npm run sync:legacy-env
# or: node scripts/sync-env-from-legacy.mjs e:\dev.abadraho.com\.env
```

Pulls: `GOOGLE_*`, `FACEBOOK_*`, `MAIL_*`, `MAPBOX_ACCESS_TOKEN`, and sets OAuth callback paths to match Laravel (`/auth/google/call-back`, `/auth/facebook/call-back`).

OAuth redirect URIs — add **localhost** in Google/Facebook console if `AUTH_URL=http://localhost:3000`:

- `http://localhost:3000/auth/google/call-back`
- `http://localhost:3000/auth/facebook/call-back`

(Production already has `https://dev.abadraho.com/auth/google/call-back` etc.)

## User types (`userTypeIds`)

| Role | ID |
|------|-----|
| Super Admin | -10021 |
| Admin | -10022 |
| Employee | -10023 |
| Website user (default register) | -10024 |
| Builder | -10025 |
| Buyer | -10026 |
| Agent / Broker | -10027 |

## Test flow (local)

1. `npm run dev`
2. `/register` → create account → phone OTP (dev OTP shown in UI)
3. `/login` → sign in
4. `/account/profile` → edit + save
5. `/account/password` → change password
6. `/reset-password` → request link (dev URL in response if no SMTP)
7. `/verify-email` → resend or open link from dev console

## Done when

New user: **register → OTP → login → profile → password change** — all on v2, no `dev.abadraho.com` redirect.
