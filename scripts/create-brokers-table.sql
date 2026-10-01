-- Optional: create brokers + broker_area for full agent admin parity (legacy dev.abadraho.com).
-- Run against your v2 database, e.g. mysql -u user -p markprop_dev_abadraho < scripts/create-brokers-table.sql

CREATE TABLE IF NOT EXISTS `brokers` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `contact_person_name` varchar(255) DEFAULT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `company_name` varchar(255) DEFAULT NULL,
  `company_address` text,
  `agent_since_years` int DEFAULT NULL,
  `deals_in` text,
  `user_id` int unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_archive` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `brokers_user_id_unique` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `broker_area` (
  `broker_id` int unsigned NOT NULL,
  `area_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`broker_id`, `area_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ensure Agent user type exists (some dumps omit it)
INSERT IGNORE INTO `user_types` (`id`, `user_type_name`)
VALUES (-10027, 'Agent');

-- Backfill broker rows from existing agent users (user_type_id = -10027)
INSERT INTO `brokers` (
  `contact_person_name`,
  `contact_number`,
  `contact_email`,
  `user_id`,
  `is_active`,
  `is_archive`,
  `created_at`,
  `updated_at`
)
SELECT
  TRIM(CONCAT(u.first_name, ' ', IFNULL(u.last_name, ''))),
  u.phone_number,
  u.email,
  u.id,
  1,
  0,
  u.created_at,
  u.updated_at
FROM `users` u
WHERE u.user_type_id = -10027
  AND u.is_archive = 0
  AND NOT EXISTS (SELECT 1 FROM `brokers` b WHERE b.user_id = u.id);
