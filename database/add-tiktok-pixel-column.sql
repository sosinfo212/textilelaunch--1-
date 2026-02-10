-- Add tiktok_pixel_code column to app_settings table
-- Run this on production: mysql -u root agency < add-tiktok-pixel-column.sql

USE agency;

-- Add tiktok_pixel_code column if it doesn't exist
ALTER TABLE app_settings 
ADD COLUMN tiktok_pixel_code TEXT DEFAULT NULL AFTER facebook_pixel_code;
