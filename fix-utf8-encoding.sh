#!/bin/bash
set -euo pipefail

# Script to fix UTF-8 encoding issues for Arabic/French characters
# Run this on the server as root: sudo bash fix-utf8-encoding.sh

DB_NAME="agency"
DB_USER="textilelaunch_db"
DB_PASSWORD="VotreMotDePasseSecurise123!"

echo "=== Fixing UTF-8 Encoding for Database ==="

# Convert database to utf8mb4
echo "Converting database to utf8mb4..."
mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 <<EOF
ALTER DATABASE ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF

# Convert products table columns to utf8mb4
echo "Converting products table columns to utf8mb4..."
mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 ${DB_NAME} <<EOF
-- Drop foreign key constraints that reference products table
SET FOREIGN_KEY_CHECKS=0;

-- Modify only the text columns (not id or owner_id which are referenced by foreign keys)
ALTER TABLE products 
  MODIFY name VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  MODIFY description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY category VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY supplier VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Set default charset for the table
ALTER TABLE products DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;
EOF

# Convert users table columns to utf8mb4
echo "Converting users table columns to utf8mb4..."
mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 ${DB_NAME} <<EOF
SET FOREIGN_KEY_CHECKS=0;

ALTER TABLE users 
  MODIFY name VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY email VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE users DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;
EOF

# Convert orders table columns to utf8mb4
echo "Converting orders table columns to utf8mb4..."
mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 ${DB_NAME} <<EOF
SET FOREIGN_KEY_CHECKS=0;

ALTER TABLE orders 
  MODIFY product_name VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE orders DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;
EOF

# Convert landing_page_templates table columns to utf8mb4
echo "Converting landing_page_templates table columns to utf8mb4..."
mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 ${DB_NAME} <<EOF
SET FOREIGN_KEY_CHECKS=0;

ALTER TABLE landing_page_templates 
  MODIFY name VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE landing_page_templates DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;
EOF

# Convert app_settings table columns to utf8mb4
echo "Converting app_settings table columns to utf8mb4..."
mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 ${DB_NAME} <<EOF
SET FOREIGN_KEY_CHECKS=0;

ALTER TABLE app_settings 
  MODIFY shop_name VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE app_settings DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS=1;
EOF

echo "✅ UTF-8 encoding fix complete!"
echo "Please restart the textilelaunch service: systemctl restart textilelaunch"
