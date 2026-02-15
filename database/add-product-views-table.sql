-- Product analytics: unique visitors and time on landing page
-- Run: mysql -u root -p agency < database/add-product-views-table.sql
-- No FK to avoid errno 150 when products table charset/collation differs.

USE agency;

CREATE TABLE IF NOT EXISTS product_views (
  id VARCHAR(191) PRIMARY KEY,
  product_id VARCHAR(191) NOT NULL,
  session_id VARCHAR(191) NOT NULL,
  first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  time_spent_seconds INT DEFAULT 0,
  UNIQUE KEY uq_product_session (product_id, session_id),
  INDEX idx_product_views_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
