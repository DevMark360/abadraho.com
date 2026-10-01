-- Add columns for simplified user activity tracking (run once on server).
-- Safe to re-run: ignore "Duplicate column" errors if columns already exist.

ALTER TABLE user_search_history
  ADD COLUMN project_id INT NULL AFTER user_id;

ALTER TABLE user_search_history
  ADD COLUMN area VARCHAR(255) NULL AFTER project_id;

-- Optional index for per-user analytics queries
CREATE INDEX idx_user_search_history_user_created
  ON user_search_history (user_id, created_at DESC);
