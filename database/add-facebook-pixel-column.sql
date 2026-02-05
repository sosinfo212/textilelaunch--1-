-- Add facebook_pixel_code column to app_settings table
-- Run this on production: mysql -u root agency < add-facebook-pixel-column.sql

USE agency;

-- Add facebook_pixel_code column if it doesn't exist
ALTER TABLE app_settings 
ADD COLUMN facebook_pixel_code TEXT DEFAULT NULL AFTER gemini_api_key;
