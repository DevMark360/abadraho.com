-- Advertising Portal — Phase 2, Milestone 9 (project tier taxonomy + targeting)
--
-- Adds one nullable column to the existing `projects` table (safe, additive, no data loss)
-- and one brand-new table `ad_campaign_tiers` (mirrors ad_campaign_areas/ad_campaign_project_types).
-- Safe to run against production as-is — does not touch any other existing column/table.
--
-- How to apply: same process as prior manual-migrations in this folder — copy files, run
-- `npx prisma generate`, apply this SQL once via phpMyAdmin, restart the app.
-- Check first if already applied: `SHOW COLUMNS FROM projects LIKE 'tier';` and
-- `SHOW TABLES LIKE 'ad_campaign_tiers';`

-- AlterTable
ALTER TABLE `projects` ADD COLUMN `tier` VARCHAR(20) NULL;

-- CreateTable
CREATE TABLE `ad_campaign_tiers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `campaign_id` INTEGER NOT NULL,
    `tier` VARCHAR(20) NOT NULL,

    UNIQUE INDEX `ad_campaign_tiers_campaign_id_tier_key`(`campaign_id`, `tier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ad_campaign_tiers` ADD CONSTRAINT `ad_campaign_tiers_campaign_id_fkey` FOREIGN KEY (`campaign_id`) REFERENCES `ad_campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
