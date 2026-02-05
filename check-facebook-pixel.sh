#!/bin/bash
set -euo pipefail

# Script to check if Facebook Pixel code is saved in the database
# Run this on the server as root: sudo bash check-facebook-pixel.sh

DB_NAME="agency"
DB_USER="textilelaunch_db"
DB_PASSWORD="VotreMotDePasseSecurise123!"

echo "=== Checking Facebook Pixel Code in Database ==="
echo ""

# Check if column exists
echo "1. Checking if facebook_pixel_code column exists..."
COLUMN_EXISTS=$(mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 ${DB_NAME} -N -e "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='app_settings' AND COLUMN_NAME='facebook_pixel_code';" 2>/dev/null || echo "0")

if [ "$COLUMN_EXISTS" -eq 0 ]; then
    echo "❌ Column 'facebook_pixel_code' does NOT exist in app_settings table"
    echo "   Run: sudo bash add-facebook-pixel-column.sh"
    exit 1
else
    echo "✅ Column 'facebook_pixel_code' exists"
fi

echo ""
echo "2. Checking all users and their Facebook Pixel code status..."
echo ""

# Get all users and their pixel code status
mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 ${DB_NAME} <<EOF
SELECT 
    user_id,
    shop_name,
    CASE 
        WHEN facebook_pixel_code IS NULL THEN 'NULL'
        WHEN facebook_pixel_code = '' THEN 'EMPTY'
        ELSE CONCAT('HAS CODE (', LENGTH(facebook_pixel_code), ' chars)')
    END AS pixel_status,
    LEFT(facebook_pixel_code, 100) AS pixel_preview
FROM app_settings
ORDER BY user_id;
EOF

echo ""
echo "3. Detailed check for specific user (usr_admin)..."
echo ""

# Check specific user
mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 ${DB_NAME} <<EOF
SELECT 
    user_id,
    shop_name,
    CASE 
        WHEN facebook_pixel_code IS NULL THEN 'NULL'
        WHEN facebook_pixel_code = '' THEN 'EMPTY'
        ELSE CONCAT('HAS CODE - Length: ', LENGTH(facebook_pixel_code), ' characters')
    END AS pixel_status
FROM app_settings
WHERE user_id = 'usr_admin';
EOF

echo ""
echo "4. Full Facebook Pixel code for usr_admin (if exists)..."
echo ""

# Show full code if exists
mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 ${DB_NAME} -N -e "SELECT facebook_pixel_code FROM app_settings WHERE user_id = 'usr_admin' AND facebook_pixel_code IS NOT NULL AND facebook_pixel_code != '';" 2>/dev/null || echo "No Facebook Pixel code found for usr_admin"

echo ""
echo "=== Done ==="
