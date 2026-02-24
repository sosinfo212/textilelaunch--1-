-- Add product reviews (per product) and show_reviews flag.
-- Run: mysql -u USER -p DB_NAME < database/add-product-reviews.sql

ALTER TABLE products
  ADD COLUMN reviews JSON NULL COMMENT 'Array of { author, rating, text }',
  ADD COLUMN show_reviews TINYINT(1) DEFAULT 1 COMMENT '1 = show reviews section on landing page';
