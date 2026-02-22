-- Payment options: product-level (COD / Stripe / Both) and order payment method
-- Run once: mysql -u root -p agency < database/add-payment-options.sql

USE agency;

-- Products: how customer can pay for this product
ALTER TABLE products
  ADD COLUMN payment_options VARCHAR(20) NOT NULL DEFAULT 'cod_only'
  COMMENT 'cod_only | stripe_only | both';

-- Orders: how the customer paid (or will pay)
ALTER TABLE orders
  ADD COLUMN payment_method VARCHAR(20) DEFAULT 'cod'
  COMMENT 'cod | stripe',
  ADD COLUMN stripe_payment_intent_id VARCHAR(255) NULL;

-- App settings: Stripe keys (per seller)
ALTER TABLE app_settings
  ADD COLUMN stripe_publishable_key VARCHAR(255) NULL,
  ADD COLUMN stripe_secret_key VARCHAR(255) NULL;
