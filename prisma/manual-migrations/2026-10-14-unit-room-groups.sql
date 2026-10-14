-- Room groups for units with more than one layout / floor (e.g. "Ground floor", "First floor").
--
-- 1. New table unit_room_groups: the named groups of one unit, in display order.
-- 2. New nullable column room_type_unit.room_group_id: which group a room belongs to
--    (NULL = not in a group, which is every existing room).
-- Purely additive: no existing data is changed, and units without groups look exactly as before.
--
-- How to apply: run this SQL once in phpMyAdmin, then restart the app. No prisma generate needed
-- (both are used through raw SQL). Until it is applied, the grouping option is hidden in admin.
-- Check first if already applied:
--   SHOW TABLES LIKE 'unit_room_groups';
--   SHOW COLUMNS FROM room_type_unit LIKE 'room_group_id';

CREATE TABLE IF NOT EXISTS `unit_room_groups` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `unit_id` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    INDEX `unit_room_groups_unit_id` (`unit_id`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `room_type_unit`
    ADD COLUMN `room_group_id` INTEGER NULL DEFAULT NULL,
    ADD INDEX `room_type_unit_room_group_id` (`room_group_id`);
