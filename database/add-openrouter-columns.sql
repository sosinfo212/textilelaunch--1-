-- OpenRouter API key and LLM model for product description generation
-- Run: mysql -u USER -p DB_NAME < database/add-openrouter-columns.sql

ALTER TABLE app_settings
  ADD COLUMN openrouter_api_key TEXT NULL COMMENT 'OpenRouter API key for AI descriptions';

ALTER TABLE app_settings
  ADD COLUMN llm_model VARCHAR(191) NULL DEFAULT 'google/gemini-2.0-flash-001' COMMENT 'OpenRouter model id';
