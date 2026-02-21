-- Add device and browser to product_views for tracking pixel analytics
-- Run: mysql -u root -p agency < database/add-product-views-device-browser.sql

USE agency;

-- Add device (android|iphone|computer) and browser name. Run once; if columns exist, ignore duplicate error.
ALTER TABLE product_views ADD COLUMN device VARCHAR(50) DEFAULT NULL;
ALTER TABLE product_views ADD COLUMN browser VARCHAR(100) DEFAULT NULL;
