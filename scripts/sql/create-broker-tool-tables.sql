-- Agent portal tool tables (v2 Prisma schema). Run on markprop_dev_abadraho when missing.
-- Legacy Laravel may use extra columns; this minimal set matches abadraho-v2.

CREATE TABLE IF NOT EXISTS `broker_pitch_decks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `broker_id` int NOT NULL,
  `project_id` int NOT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `broker_pitch_decks_broker_id` (`broker_id`),
  KEY `broker_pitch_decks_project_id` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `broker_whatsapp_cards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `broker_id` int NOT NULL,
  `project_id` int NOT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `broker_whatsapp_cards_broker_id` (`broker_id`),
  KEY `broker_whatsapp_cards_project_id` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `broker_short_links` (
  `id` int NOT NULL AUTO_INCREMENT,
  `broker_id` int NOT NULL,
  `project_id` int NOT NULL,
  `short_code` varchar(64) NOT NULL,
  `clicks` int NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `broker_short_links_short_code` (`short_code`),
  KEY `broker_short_links_broker_id` (`broker_id`),
  KEY `broker_short_links_project_id` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
