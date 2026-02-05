#!/bin/bash
set -euo pipefail

# Script to add videos column to products table if it doesn't exist
# Run this on the server as root: sudo bash fix-videos-column.sh

DB_NAME="agency"
DB_USER="textilelaunch_db"
DB_PASSWORD="VotreMotDePasseSecurise123!"

echo "Checking and adding videos column to products table..."

# Check if column exists
COLUMN_EXISTS=$(mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 ${DB_NAME} -N -e "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME='products' AND COLUMN_NAME='videos';" 2>/dev/null || echo "0")

if [ "$COLUMN_EXISTS" -eq 0 ]; then
    echo "Adding videos column..."
    mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 ${DB_NAME} <<EOF
ALTER TABLE products 
ADD COLUMN videos JSON DEFAULT NULL AFTER images;
EOF
    if [ $? -eq 0 ]; then
        echo "✅ Videos column added successfully"
    else
        echo "❌ Failed to add videos column"
        exit 1
    fi
else
    echo "✅ Videos column already exists"
fi

echo "Done."
