-- Advertising Portal — Phase 2, Milestone 11 (WhatsApp ad card packages)
--
-- Adds two brand-new tables: ad_whatsapp_packages (a builder's pre-paid card allowance for
-- a project) and ad_whatsapp_cards (one row per generated card, decrementing the package's
-- remaining credit). Purely additive — no existing table/column touched.
--
-- How to apply: same process as prior manual-migrations in this folder — copy files, run
-- `npx prisma generate`, apply this SQL once via phpMyAdmin, restart the app.
-- Check first if already applied: `SHOW TABLES LIKE 'ad_whatsapp_%';`

-- CreateTable
CREATE TABLE `ad_whatsapp_packages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `builder_id` INTEGER NOT NULL,
    `project_id` INTEGER NOT NULL,
    `total_cards` INTEGER NOT NULL,
    `used_cards` INTEGER NOT NULL DEFAULT 0,
    `price_paid` DECIMAL(12, 2) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ad_whatsapp_packages_builder_id_idx`(`builder_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ad_whatsapp_cards` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `package_id` INTEGER NOT NULL,
    `file_path` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ad_whatsapp_cards_package_id_idx`(`package_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ad_whatsapp_packages` ADD CONSTRAINT `ad_whatsapp_packages_builder_id_fkey` FOREIGN KEY (`builder_id`) REFERENCES `builders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_whatsapp_packages` ADD CONSTRAINT `ad_whatsapp_packages_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_whatsapp_cards` ADD CONSTRAINT `ad_whatsapp_cards_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `ad_whatsapp_packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
