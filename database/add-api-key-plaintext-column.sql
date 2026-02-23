-- Store API key (plaintext) so user can view it later from Settings.
-- Run after add-api-key-column.sql. If column exists, ignore the error.

ALTER TABLE app_settings
  ADD COLUMN api_key_plaintext TEXT NULL COMMENT 'Stored API key for viewing (owner only)';
