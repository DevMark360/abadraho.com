# Phase 0 — Legacy proxy audit

Generated: 2026-06-01T07:53:33.326Z

LEGACY_API_URL: `https://dev.abadraho.com/api`
LEGACY_SITE: `https://dev.abadraho.com`

v2 forwards via `/api/v1/proxy/[...path]` — use only for endpoints not yet on Prisma.

## Summary

| Result | Count |
|--------|-------|
| OK (2xx) | 8 |
| Broken / unreachable | 4 |

## Broken or non-2xx endpoints

| Endpoint | Status | Note |
|----------|--------|------|
| POST projects/filter | 200 | [degraded]  { "message": "Server Error" } |
| POST login | 200 | [degraded]  { "message": "Server Error" } |
| POST register | 200 | [degraded]  {"message":"The given data was invalid.","errors |
| POST search history | 200 | [degraded]  { "message": "Server Error" } |

## Full probe list

| Endpoint | Status | OK |
|----------|--------|-----|
| GET projects/all | 200 | yes |
| GET projects/all-areas | 200 | yes |
| GET projects/all-types | 200 | yes |
| GET projects/all-units | 200 | yes |
| GET all (search) | 200 | yes |
| POST projects/filter | 200 | no |
| POST filter (search) | 200 | yes |
| POST projects/show | 200 | yes |
| POST login | 200 | no |
| POST register | 200 | no |
| POST search history | 200 | no |
| GET site off-plan map-data | 200 | yes |