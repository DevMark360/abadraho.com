-- Agent portal ops — run on markprop_dev_abadraho (XAMPP / MariaDB)
-- phpMyAdmin: select DB → Import tab → choose this file
-- OR copy ALL lines below into SQL tab → Go

-- ─── Extend brokers (run once; ignore "Duplicate column" if re-running) ───
ALTER TABLE `brokers` ADD COLUMN `commission_type` ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage' AFTER `deals_in`;
ALTER TABLE `brokers` ADD COLUMN `default_commission` DECIMAL(12,2) NULL AFTER `commission_type`;
ALTER TABLE `brokers` ADD COLUMN `bank_name` VARCHAR(255) NULL AFTER `default_commission`;
ALTER TABLE `brokers` ADD COLUMN `account_title` VARCHAR(255) NULL AFTER `bank_name`;
ALTER TABLE `brokers` ADD COLUMN `account_number` VARCHAR(100) NULL AFTER `account_title`;
ALTER TABLE `brokers` ADD COLUMN `iban` VARCHAR(50) NULL AFTER `account_number`;
ALTER TABLE `brokers` ADD COLUMN `payment_notes` TEXT NULL AFTER `iban`;
ALTER TABLE `brokers` ADD COLUMN `agent_tier` ENUM('bronze','silver','gold','platinum') NOT NULL DEFAULT 'bronze' AFTER `payment_notes`;
ALTER TABLE `brokers` ADD COLUMN `agent_code` VARCHAR(20) NULL AFTER `agent_tier`;

-- Skip if index already exists:
-- ALTER TABLE `brokers` ADD UNIQUE KEY `brokers_agent_code_unique` (`agent_code`);

-- ─── New tables ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `broker_project_assignments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `broker_id` INT NOT NULL,
  `project_id` INT NOT NULL,
  `commission_type` ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
  `commission_value` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `notes` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `broker_project_assignments_broker_project` (`broker_id`, `project_id`),
  KEY `broker_project_assignments_broker_id` (`broker_id`),
  KEY `broker_project_assignments_project_id` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `broker_commissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `broker_id` INT NOT NULL,
  `project_id` INT NOT NULL,
  `lead_id` INT NULL,
  `deal_value` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `commission_amount` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `status` ENUM('pending','confirmed','paid') NOT NULL DEFAULT 'pending',
  `payment_reference` VARCHAR(255) NULL,
  `paid_at` DATETIME(3) NULL,
  `payment_notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `broker_commissions_broker_id` (`broker_id`),
  KEY `broker_commissions_project_id` (`project_id`),
  KEY `broker_commissions_status` (`status`),
  KEY `broker_commissions_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `broker_leads` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `broker_id` INT NOT NULL,
  `client_name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `email` VARCHAR(255) NULL,
  `project_id` INT NULL,
  `unit_id` INT NULL,
  `source` VARCHAR(100) NULL,
  `status` ENUM('new','contacted','qualified','negotiation','closed_won','closed_lost') NOT NULL DEFAULT 'new',
  `notes` TEXT NULL,
  `last_contacted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `broker_leads_broker_id` (`broker_id`),
  KEY `broker_leads_project_id` (`project_id`),
  KEY `broker_leads_unit_id` (`unit_id`),
  KEY `broker_leads_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `broker_assignment_requests` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `broker_id` INT NOT NULL,
  `project_id` INT NOT NULL,
  `message` TEXT NULL,
  `status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `admin_notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `broker_assignment_requests_broker_id` (`broker_id`),
  KEY `broker_assignment_requests_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `broker_referral_clicks` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `broker_id` INT NOT NULL,
  `session_key` VARCHAR(64) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `broker_referral_clicks_broker_id` (`broker_id`),
  KEY `broker_referral_clicks_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

UPDATE `brokers`
SET `agent_code` = CONCAT('AGT-', LPAD(id, 5, '0'))
WHERE `agent_code` IS NULL OR `agent_code` = '';

ALTER TABLE `broker_leads` ADD COLUMN `unit_id` INT NULL AFTER `project_id`;
ALTER TABLE `broker_leads` ADD KEY `broker_leads_unit_id` (`unit_id`);
