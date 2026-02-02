-- Fix Schema Mismatches
-- Run this to align your database with database_dump.txt structure

USE agency;

-- Add missing password column to users table if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password VARCHAR(191) AFTER email;

-- Verify all tables have correct structure
-- Users table should have: id, email, password, name, role, created_at, updated_at
-- Products table should have: id, owner_id, name, description, price, regular_price, images, attributes, category, supplier, landing_page_template_id, created_at, updated_at
-- Orders table should have: id, seller_id, product_id, product_name, product_price, product_supplier, customer_info, selected_attributes, status, viewed, created_at, updated_at
-- Landing_page_templates should have: id, owner_id, name, mode, elements, html_code, created_at, updated_at

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_products_owner ON products(owner_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_product ON orders(product_id);
CREATE INDEX IF NOT EXISTS idx_templates_owner ON landing_page_templates(owner_id);

-- Verify foreign keys (they should already exist from schema.sql)
-- If they don't exist, they will be added below

-- Add foreign keys if they don't exist (MySQL doesn't support IF NOT EXISTS for foreign keys)
-- Check and add foreign key for products.owner_id
SET @dbname = DATABASE();
SET @tablename = "products";
SET @columnname = "owner_id";
SET @fkname = "products_ibfk_1";
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = @columnname 
   AND CONSTRAINT_NAME = @fkname) > 0,
  "SELECT 'Foreign key already exists' AS result;",
  CONCAT("ALTER TABLE ", @tablename, " ADD CONSTRAINT ", @fkname, " FOREIGN KEY (", @columnname, ") REFERENCES users(id) ON DELETE CASCADE;")
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add foreign key for orders.seller_id
SET @tablename = "orders";
SET @columnname = "seller_id";
SET @fkname = "orders_ibfk_1";
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = @columnname 
   AND CONSTRAINT_NAME = @fkname) > 0,
  "SELECT 'Foreign key already exists' AS result;",
  CONCAT("ALTER TABLE ", @tablename, " ADD CONSTRAINT ", @fkname, " FOREIGN KEY (", @columnname, ") REFERENCES users(id) ON DELETE CASCADE;")
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add foreign key for orders.product_id
SET @columnname = "product_id";
SET @fkname = "orders_ibfk_2";
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = @columnname 
   AND CONSTRAINT_NAME = @fkname) > 0,
  "SELECT 'Foreign key already exists' AS result;",
  CONCAT("ALTER TABLE ", @tablename, " ADD CONSTRAINT ", @fkname, " FOREIGN KEY (", @columnname, ") REFERENCES products(id) ON DELETE CASCADE;")
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add foreign key for landing_page_templates.owner_id
SET @tablename = "landing_page_templates";
SET @columnname = "owner_id";
SET @fkname = "landing_page_templates_ibfk_1";
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = @columnname 
   AND CONSTRAINT_NAME = @fkname) > 0,
  "SELECT 'Foreign key already exists' AS result;",
  CONCAT("ALTER TABLE ", @tablename, " ADD CONSTRAINT ", @fkname, " FOREIGN KEY (", @columnname, ") REFERENCES users(id) ON DELETE CASCADE;")
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Schema fixes completed!' AS status;
