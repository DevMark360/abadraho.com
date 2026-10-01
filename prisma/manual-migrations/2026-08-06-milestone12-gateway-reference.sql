-- Advertising Portal — Phase 2, Milestone 12 (JazzCash sandbox payment gateway)
--
-- Adds one nullable column to the existing ad_wallet_transactions table, to store the
-- gateway's transaction reference (JazzCash pp_TxnRefNo) for reconciliation. Safe, additive,
-- no data loss, no other table touched.
--
-- How to apply: same process as prior manual-migrations in this folder — copy files, run
-- `npx prisma generate`, apply this SQL once via phpMyAdmin, restart the app.
-- Check first if already applied: `SHOW COLUMNS FROM ad_wallet_transactions LIKE 'gateway_reference';`

-- AlterTable
ALTER TABLE `ad_wallet_transactions` ADD COLUMN `gateway_reference` VARCHAR(40) NULL;

-- CreateIndex
CREATE INDEX `ad_wallet_transactions_gateway_reference_idx` ON `ad_wallet_transactions`(`gateway_reference`);
