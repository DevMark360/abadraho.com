# Phase 2 — Wishlist, Reviews & User Actions

## Checklist

| # | Task | Status |
|---|------|--------|
| 2.1 | Wishlist DB sync (auth) | ✅ `/api/v1/wishlist`, `/add-wishlist/[id]`, client sync |
| 2.2 | Reviews add (auth) | ✅ `POST /api/v1/reviews` |
| 2.3 | Admin reviews | ✅ CRUD (legacy has no approval queue — reviews live immediately) |
| 2.4 | Recent views | ✅ DB + guest cookie, project detail |
| 2.5 | Activity log | ✅ `POST /api/v1/activity-log` |

## APIs

| Method | Path | Auth |
|--------|------|------|
| GET/POST/DELETE | `/api/v1/wishlist` | POST/DELETE require login |
| POST | `/api/v1/wishlist/sync` | Merge localStorage → DB |
| GET | `/api/v1/wishlist/ids` | Logged-in project ids |
| GET | `/api/v1/reviews?projectId=` | Public list |
| POST | `/api/v1/reviews` | Login required |
| GET/POST | `/api/v1/recent-views` | POST tracks view |
| POST | `/api/v1/activity-log` | Optional login |

## Legacy routes (v2)

- `GET /add-wishlist/{id}` → adds to DB, redirects
- `POST /create/custom-activity-log` → `/api/v1/activity-log`

## Schema notes

- `wishlists.product_id` = project id (Laravel column name)
- `reviews.review` = comment text (varchar 255)
- `recent_views` table required

If `wishlists` table missing locally, run:

```sql
CREATE TABLE IF NOT EXISTS `wishlists` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `wishlists_user_id_product_id_unique` (`user_id`,`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## Test

1. Login → heart on project → `/account/wishlist` shows DB entry
2. Project detail → submit review (login required)
3. Admin → Reviews → see/delete entries
4. Open 2–3 projects → “Recently viewed” section appears
5. Browser network → `activity-log` on project view
