# Phase 3 — Project Detail 100% (public core)

## Checklist

| # | Task | Status |
|---|------|--------|
| 3.1 | Unit rooms breakdown | ✅ `UnitRoomsSection` + `room_type_unit` in DB detail |
| 3.2 | GET `/getunits` | ✅ `/api/v1/units` + `/getunits` |
| 3.3 | POST `unit-types` | ✅ `/api/v1/unit-types` + `/api/unit-types` |
| 3.4 | Similar projects (DB) | ✅ `similar-projects.service` + `POST /api/v1/projects/similar` |
| 3.5 | Amenities + utilities | ✅ `ProjectFeatures` from DB |
| 3.6 | Videos + documents | ✅ `ProjectMediaSection` + gallery |
| 3.7 | Social share | ✅ Facebook, Twitter, LinkedIn, WhatsApp |
| 3.8 | PDF download native | ✅ `/download-pdf/{id}/{filename}` reads `project_doc` from DB |

## APIs

| Method | Path | Notes |
|--------|------|-------|
| GET | `/getunits`, `/api/v1/units` | `?project_id=` or `?unit_id=` |
| POST | `/api/unit-types`, `/api/v1/unit-types` | Body `{ id }` = unit id |
| POST | `/api/v1/projects/similar` | Body `{ project_id }` |
| GET | `/download-pdf/{projectId}/{filename}` | Native PDF stream |

## Detail page sections

1. Image gallery (`project_imgs` + cover)
2. Amenities / utilities
3. Unit room allocation (per unit picker)
4. Media (YouTube + `videos` table + PDF list)
5. Units table
6. Reviews, recent views, similar projects

## Data source

With `USE_DATABASE=true`, `getProjectDetail` loads from **MySQL first** (legacy API fallback).

## Test

1. Open `/project/{slug}` — gallery, features, rooms, media visible when DB has data
2. Change unit in room allocation dropdown
3. Network: `GET /getunits?project_id=` when rooms empty on SSR
4. `POST /api/v1/projects/similar` returns JSON array
5. PDF link uses real filename from `project_doc` (not hardcoded `brochure`)
6. Share buttons open Facebook / Twitter / LinkedIn / WhatsApp
