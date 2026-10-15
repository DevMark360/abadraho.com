-- Google Maps embed for the project page's Location map.
--
-- New nullable column projects.map_embed_url: the src of the "Embed a map" iframe from Google Maps
-- (https://www.google.com/maps/embed?pb=...). NULL = no embed, the page keeps the coordinate map.
-- Purely additive: no existing data is changed.
--
-- How to apply: run this SQL once in phpMyAdmin, then restart the app. No prisma generate needed
-- (the column is used through raw SQL). Until it is applied, the embed can't be saved.
-- Check first if already applied:
--   SHOW COLUMNS FROM projects LIKE 'map_embed_url';

ALTER TABLE `projects`
    ADD COLUMN `map_embed_url` TEXT NULL DEFAULT NULL;
