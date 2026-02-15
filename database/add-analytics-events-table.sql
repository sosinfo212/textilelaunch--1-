-- Analytics events: CTA clicks and time-spent per product/session
-- Run: mysql -u root -p agency < database/add-analytics-events-table.sql

USE agency;

CREATE TABLE IF NOT EXISTS analytics_events (
  id VARCHAR(191) PRIMARY KEY,
  product_id VARCHAR(191) NOT NULL,
  product_slug VARCHAR(191) NOT NULL,
  session_id VARCHAR(191) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  event_value INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_analytics_product (product_id),
  INDEX idx_analytics_session (session_id),
  INDEX idx_analytics_type (event_type),
  INDEX idx_analytics_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
