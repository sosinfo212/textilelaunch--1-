-- Affiliate network integrations: store credentials and one-time launch tokens
-- Run once: mysql -u root -p agency < database/add-affiliate-integrations.sql

USE agency;

-- Connections: one per user per network (e.g. Azome Affiliate)
-- No FK to users: avoids collation mismatch across MySQL versions (app enforces user_id)
CREATE TABLE IF NOT EXISTS affiliate_connections (
  id VARCHAR(191) PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  name VARCHAR(255) NOT NULL,
  login_url VARCHAR(512) NOT NULL,
  email_encrypted TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_affiliate_connections_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One-time tokens for "Connect" (open affiliate site already logged in)
CREATE TABLE IF NOT EXISTS affiliate_launch_tokens (
  token VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(191) NOT NULL,
  connection_id VARCHAR(191) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_affiliate_launch_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
