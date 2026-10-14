-- Cache for the AI location / developer verdicts on the Compare page.
--
-- Adds one brand-new table, compare_ai_verdicts. Each row is one pair of area names or one pair
-- of developer names (stored in alphabetical order) with Groq's verdict, so the same pair is
-- only ever asked once. Admins can correct a verdict (is_manual = 1) or delete it to ask again
-- at /admin/compare-verdicts. Purely additive: no existing table or column is touched.
--
-- How to apply: run this SQL once in phpMyAdmin, then restart the app. No prisma generate needed
-- (the table is used through raw SQL). Until it is applied, verdicts are only cached in memory.
-- Check first if already applied: SHOW TABLES LIKE 'compare_ai_verdicts';

CREATE TABLE IF NOT EXISTS `compare_ai_verdicts` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `kind` VARCHAR(20) NOT NULL,
    `pair_key` CHAR(40) NOT NULL,
    `name_a` VARCHAR(191) NOT NULL,
    `name_b` VARCHAR(191) NOT NULL,
    `winner` VARCHAR(4) NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `model` VARCHAR(100) NULL,
    `is_manual` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    UNIQUE INDEX `compare_ai_verdicts_kind_pair_key` (`kind`, `pair_key`),
    INDEX `compare_ai_verdicts_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
