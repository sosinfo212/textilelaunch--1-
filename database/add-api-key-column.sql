-- Add API key hash column for API key authentication (Settings → Generate API key)
-- Run: mysql -u USER -p DB_NAME < database/add-api-key-column.sql
-- If the column already exists, you can ignore the error.

ALTER TABLE app_settings
  ADD COLUMN api_key_hash VARCHAR(64) NULL COMMENT 'SHA-256 hash of the API key';
