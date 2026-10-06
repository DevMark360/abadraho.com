-- Admin-managed WhatsApp ad card package catalog (was hard-coded in advertising-whatsapp.service.ts).
--
-- Adds one brand-new table, ad_whatsapp_plans, and seeds it with the three packages that were
-- hard-coded before (25 / 50 / 100 cards), so builders see no change until an admin edits them.
-- Purely additive: no existing table or column is touched. Past purchases (ad_whatsapp_packages)
-- keep their own total_cards / price_paid and are not linked to this table.
--
-- How to apply: same as prior manual-migrations: deploy the code (npm install runs
-- `prisma generate`), run this SQL once in phpMyAdmin, then restart the app.
-- Until it is applied, the site keeps using the old built-in three packages.
-- Check first if already applied: SHOW TABLES LIKE 'ad_whatsapp_plans';

CREATE TABLE `ad_whatsapp_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NULL,
    `cards` INTEGER NOT NULL,
    `price` DECIMAL(12, 2) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `ad_whatsapp_plans` (`name`, `cards`, `price`, `is_active`, `sort_order`) VALUES
  (NULL, 25, 2500.00, true, 1),
  (NULL, 50, 4500.00, true, 2),
  (NULL, 100, 8000.00, true, 3);
