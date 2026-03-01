-- Add cost column to products table (e.g. cost price for margin calculation)
-- Run: mysql -u USER -p DB_NAME < database/add-cost-column.sql
-- If the column already exists, you can ignore the error.

ALTER TABLE products
  ADD COLUMN cost DECIMAL(10, 2) NULL COMMENT 'Cost price of the product' AFTER regular_price;
