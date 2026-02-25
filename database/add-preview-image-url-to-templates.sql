-- Add optional preview image URL to landing page templates (run once)
ALTER TABLE landing_page_templates
  ADD COLUMN preview_image_url TEXT NULL;
