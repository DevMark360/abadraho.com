-- Optional: run on MySQL if `videos` table is missing (legacy multi-video per project)
CREATE TABLE IF NOT EXISTS `videos` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) DEFAULT NULL,
  `url` varchar(500) NOT NULL,
  `description` text,
  `project_id` bigint(20) unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `videos_project_id_foreign` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
