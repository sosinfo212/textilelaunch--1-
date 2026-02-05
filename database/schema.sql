-- Trendy Cosmetix Database Schema
-- Database: agency

CREATE DATABASE IF NOT EXISTS agency CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE agency;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(191) PRIMARY KEY,
  email VARCHAR(191) UNIQUE NOT NULL,
  password VARCHAR(191),
  name VARCHAR(191),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(191) PRIMARY KEY,
  owner_id VARCHAR(191) NOT NULL,
  name VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  price DECIMAL(10, 2) NOT NULL,
  regular_price DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'MAD',
  sku VARCHAR(100),
  show_sku BOOLEAN DEFAULT FALSE,
  images JSON,
  videos JSON,
  attributes JSON,
  category VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  supplier VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  landing_page_template_id VARCHAR(191),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(191) PRIMARY KEY,
  seller_id VARCHAR(191) NOT NULL,
  product_id VARCHAR(191) NOT NULL,
  product_name VARCHAR(191),
  product_price DECIMAL(10, 2),
  product_supplier VARCHAR(100),
  customer_info JSON,
  selected_attributes JSON,
  status VARCHAR(50) DEFAULT 'pending',
  viewed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Landing Page Templates Table
CREATE TABLE IF NOT EXISTS landing_page_templates (
  id VARCHAR(191) PRIMARY KEY,
  owner_id VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  mode VARCHAR(20) DEFAULT 'visual',
  elements JSON,
  layout JSON,
  html_code TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- App Settings Table (for user-specific settings)
CREATE TABLE IF NOT EXISTS app_settings (
  user_id VARCHAR(191) PRIMARY KEY,
  shop_name VARCHAR(191) DEFAULT 'Trendy Cosmetix Store',
  logo_url TEXT,
  gemini_api_key TEXT,
  facebook_pixel_code TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sessions Table (for storing authentication tokens)
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(191) PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_token (token(255)),
  INDEX idx_sessions_expires (expires_at)
);

-- Indexes for performance (using IF NOT EXISTS equivalent - MySQL doesn't support it directly)
-- Check and create indexes only if they don't exist
SET @dbname = DATABASE();
SET @idx_name = 'idx_products_owner';
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = 'products' 
   AND INDEX_NAME = @idx_name) > 0,
  'SELECT ''Index idx_products_owner already exists'' AS result;',
  'CREATE INDEX idx_products_owner ON products(owner_id);'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_name = 'idx_orders_seller';
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = 'orders' 
   AND INDEX_NAME = @idx_name) > 0,
  'SELECT ''Index idx_orders_seller already exists'' AS result;',
  'CREATE INDEX idx_orders_seller ON orders(seller_id);'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_name = 'idx_orders_product';
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = 'orders' 
   AND INDEX_NAME = @idx_name) > 0,
  'SELECT ''Index idx_orders_product already exists'' AS result;',
  'CREATE INDEX idx_orders_product ON orders(product_id);'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_name = 'idx_templates_owner';
SET @sql = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = 'landing_page_templates' 
   AND INDEX_NAME = @idx_name) > 0,
  'SELECT ''Index idx_templates_owner already exists'' AS result;',
  'CREATE INDEX idx_templates_owner ON landing_page_templates(owner_id);'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Insert default admin user
INSERT IGNORE INTO users (id, email, password, name, role) 
VALUES ('usr_admin', 'admin@textile.com', 'admin', 'Admin Vendeur', 'admin');

-- Insert default settings for admin
INSERT IGNORE INTO app_settings (user_id, shop_name) 
VALUES ('usr_admin', 'Trendy Cosmetix Store');
