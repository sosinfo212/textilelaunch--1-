#!/bin/bash
set -euo pipefail

# Script to add facebook_pixel_code column to app_settings table
# Run this on the server as root: sudo bash add-facebook-pixel-column.sh

DB_NAME="agency"
DB_USER="textilelaunch_db"
DB_PASSWORD="VotreMotDePasseSecurise123!"

echo "Adding facebook_pixel_code column to app_settings table..."

# Check if column already exists
COLUMN_EXISTS=$(mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 ${DB_NAME} -N -e "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='app_settings' AND COLUMN_NAME='facebook_pixel_code';" 2>/dev/null || echo "0")

if [ "$COLUMN_EXISTS" -eq 0 ]; then
    echo "Adding facebook_pixel_code column..."
    mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 ${DB_NAME} <<EOF
ALTER TABLE app_settings 
ADD COLUMN facebook_pixel_code TEXT DEFAULT NULL AFTER gemini_api_key;
EOF
    if [ $? -eq 0 ]; then
        echo "✅ facebook_pixel_code column added successfully"
    else
        echo "❌ Failed to add facebook_pixel_code column"
        exit 1
    fi
else
    echo "✅ facebook_pixel_code column already exists"
fi

echo "Done."
