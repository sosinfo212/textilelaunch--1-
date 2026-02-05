#!/bin/bash
set -euo pipefail

# Script to fix database credentials in .env file
# Run this on the server as root: sudo bash fix-db-credentials.sh

DEPLOY_PATH="/opt/textilelaunch"
ENV_FILE="${DEPLOY_PATH}/.env"

echo "=== Fixing Database Credentials ==="

# Check if .env file exists
if [ ! -f "${ENV_FILE}" ]; then
    echo "❌ .env file not found at ${ENV_FILE}"
    exit 1
fi

echo "Backing up .env file..."
cp "${ENV_FILE}" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

echo "Updating database credentials..."

# Update DB_USER if it's set to root
sed -i 's/^DB_USER=root$/DB_USER=textilelaunch_db/' "${ENV_FILE}"

# Update DB_PASSWORD if it's not set correctly
# Check if password is already set to the correct value
if ! grep -q "^DB_PASSWORD=VotreMotDePasseSecurise123!" "${ENV_FILE}"; then
    # If DB_PASSWORD line exists, replace it
    if grep -q "^DB_PASSWORD=" "${ENV_FILE}"; then
        sed -i 's/^DB_PASSWORD=.*/DB_PASSWORD=VotreMotDePasseSecurise123!/' "${ENV_FILE}"
    else
        # If DB_PASSWORD line doesn't exist, add it after DB_USER
        sed -i '/^DB_USER=/a DB_PASSWORD=VotreMotDePasseSecurise123!' "${ENV_FILE}"
    fi
fi

# Ensure DB_HOST is set correctly
sed -i 's/^DB_HOST=.*/DB_HOST=127.0.0.1/' "${ENV_FILE}"

# Ensure DB_PORT is set correctly
sed -i 's/^DB_PORT=.*/DB_PORT=3306/' "${ENV_FILE}"

# Ensure DB_NAME is set correctly
sed -i 's/^DB_NAME=.*/DB_NAME=agency/' "${ENV_FILE}"

echo "✅ Database credentials updated in .env file"
echo ""
echo "Updated .env file contents:"
grep -E "^DB_" "${ENV_FILE}" || echo "No DB_ variables found"

echo ""
echo "⚠️  Restart the service to apply changes:"
echo "   systemctl restart textilelaunch"
