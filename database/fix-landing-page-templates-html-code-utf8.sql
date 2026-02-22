-- Fix: Allow Unicode (e.g. ★, Arabic, emoji) in landing_page_templates.html_code
-- Run this if you get: Incorrect string value for column `agency`.`landing_page_templates`.`html_code`
-- Usage: mysql -u USER -p agency < database/fix-landing-page-templates-html-code-utf8.sql

ALTER TABLE landing_page_templates
  MODIFY html_code TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

ALTER TABLE landing_page_templates DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
