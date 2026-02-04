-- Add videos column to products table
-- Run this on production: mysql -u root agency < add_videos_column.sql

USE agency;

-- Add videos column (check manually if it exists first)
-- If column already exists, this will fail - that's okay
ALTER TABLE products 
ADD COLUMN videos JSON DEFAULT NULL AFTER images;
