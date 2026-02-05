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
ALTER TABLE products 
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY name VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  MODIFY description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY category VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY supplier VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF

# Convert users table columns to utf8mb4
echo "Converting users table columns to utf8mb4..."
mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 ${DB_NAME} <<EOF
ALTER TABLE users 
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY name VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY email VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF

# Convert orders table columns to utf8mb4
echo "Converting orders table columns to utf8mb4..."
mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 ${DB_NAME} <<EOF
ALTER TABLE orders 
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY product_name VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF

# Convert landing_page_templates table columns to utf8mb4
echo "Converting landing_page_templates table columns to utf8mb4..."
mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 ${DB_NAME} <<EOF
ALTER TABLE landing_page_templates 
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY name VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;
EOF

# Convert app_settings table columns to utf8mb4
echo "Converting app_settings table columns to utf8mb4..."
mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 ${DB_NAME} <<EOF
ALTER TABLE app_settings 
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  MODIFY shop_name VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF

echo "✅ UTF-8 encoding fix complete!"
echo "Please restart the textilelaunch service: systemctl restart textilelaunch"
