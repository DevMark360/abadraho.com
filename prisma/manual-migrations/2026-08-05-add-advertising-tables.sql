-- Advertising Portal — Phase 1, Milestone 1 (schema foundation)
--
-- Adds 8 new tables only: ad_campaigns, ad_campaign_areas, ad_campaign_project_types,
-- ad_wallets, ad_wallet_transactions, ad_floor_prices, ad_daily_stats, ad_slot_winners.
-- Does NOT alter any existing table/column — safe to run against production as-is.
--
-- Why this exists instead of `prisma db push`: this database has pre-existing drift from
-- prisma/schema.prisma unrelated to this feature (a `user_types` table not in the schema,
-- some enum-vs-varchar column mismatches). A plain `db push` will ask to drop/alter those
-- too via --accept-data-loss — do not do that as part of deploying this feature.
--
-- How to apply on production:
--   1. Copy the updated application files (including prisma/schema.prisma) as usual.
--   2. Run `npx prisma generate` on the server (or `npm install`, which triggers it via
--      the `postinstall` script) — this only regenerates Prisma Client code, it does not
--      touch the database.
--   3. Run this SQL file once against the production database (e.g. via phpMyAdmin in
--      cPanel, or `mysql -u <user> -p <database> < this-file.sql`).
--   4. Restart the app (however you normally do — e.g. touching tmp/restart.txt for
--      Passenger) so the new Prisma Client is picked up.
--
-- This file is idempotent-unsafe (CREATE TABLE will error if already run) — only run it
-- once per database. If you're not sure whether it's already been applied, check first:
--   SHOW TABLES LIKE 'ad\_%';

-- CreateTable
CREATE TABLE `ad_campaigns` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `builder_id` INTEGER NOT NULL,
    `project_id` INTEGER NOT NULL,
    `placement_type` VARCHAR(30) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `creative_url` VARCHAR(191) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'draft',
    `rejection_reason` TEXT NULL,
    `max_bid_cpm` DECIMAL(12, 2) NOT NULL,
    `budget_cap` DECIMAL(15, 2) NOT NULL,
    `impression_cap` INTEGER NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `ctr_band` INTEGER NOT NULL DEFAULT 3,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `ad_campaigns_status_idx`(`status`),
    INDEX `ad_campaigns_builder_id_idx`(`builder_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ad_campaign_areas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaign_id` INTEGER NOT NULL,
    `area_id` BIGINT UNSIGNED NOT NULL,

    UNIQUE INDEX `ad_campaign_areas_campaign_id_area_id_key`(`campaign_id`, `area_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ad_campaign_project_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaign_id` INTEGER NOT NULL,
    `project_type_id` INTEGER NOT NULL,

    UNIQUE INDEX `ad_campaign_project_types_campaign_id_project_type_id_key`(`campaign_id`, `project_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ad_wallets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `builder_id` INTEGER NOT NULL,
    `balance` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ad_wallets_builder_id_key`(`builder_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ad_wallet_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `wallet_id` INTEGER NOT NULL,
    `type` VARCHAR(30) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `balance_after` DECIMAL(15, 2) NULL,
    `reference_note` TEXT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `confirmed_by_actor_source` VARCHAR(10) NULL,
    `confirmed_by_actor_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    INDEX `ad_wallet_transactions_status_idx`(`status`),
    INDEX `ad_wallet_transactions_wallet_id_idx`(`wallet_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ad_floor_prices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `area_id` BIGINT UNSIGNED NULL,
    `project_type_id` INTEGER NULL,
    `placement_type` VARCHAR(30) NOT NULL,
    `floor_cpm` DECIMAL(12, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ad_floor_prices_area_id_project_type_id_placement_type_key`(`area_id`, `project_type_id`, `placement_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ad_daily_stats` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaign_id` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `impressions` INTEGER NOT NULL DEFAULT 0,
    `clicks` INTEGER NOT NULL DEFAULT 0,
    `spend` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `inquiries` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ad_daily_stats_campaign_id_date_key`(`campaign_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ad_slot_winners` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slot_key` VARCHAR(191) NOT NULL,
    `campaign_id` INTEGER NOT NULL,
    `effective_cpm` DECIMAL(12, 2) NOT NULL,
    `computed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `valid_until` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ad_slot_winners_slot_key_key`(`slot_key`),
    INDEX `ad_slot_winners_valid_until_idx`(`valid_until`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ad_campaigns` ADD CONSTRAINT `ad_campaigns_builder_id_fkey` FOREIGN KEY (`builder_id`) REFERENCES `builders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_campaigns` ADD CONSTRAINT `ad_campaigns_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_campaign_areas` ADD CONSTRAINT `ad_campaign_areas_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `ad_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_campaign_areas` ADD CONSTRAINT `ad_campaign_areas_area_id_fkey` FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_campaign_project_types` ADD CONSTRAINT `ad_campaign_project_types_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `ad_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_campaign_project_types` ADD CONSTRAINT `ad_campaign_project_types_project_type_id_fkey` FOREIGN KEY (`project_type_id`) REFERENCES `project_type`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_wallets` ADD CONSTRAINT `ad_wallets_builder_id_fkey` FOREIGN KEY (`builder_id`) REFERENCES `builders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_wallet_transactions` ADD CONSTRAINT `ad_wallet_transactions_wallet_id_fkey` FOREIGN KEY (`wallet_id`) REFERENCES `ad_wallets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_floor_prices` ADD CONSTRAINT `ad_floor_prices_area_id_fkey` FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_floor_prices` ADD CONSTRAINT `ad_floor_prices_project_type_id_fkey` FOREIGN KEY (`project_type_id`) REFERENCES `project_type`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_daily_stats` ADD CONSTRAINT `ad_daily_stats_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `ad_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_slot_winners` ADD CONSTRAINT `ad_slot_winners_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `ad_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
