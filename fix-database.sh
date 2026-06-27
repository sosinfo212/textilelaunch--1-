#!/bin/bash
set -euo pipefail

# Fix database connection issues on production server
# Run this on the server as root: sudo bash fix-database.sh

DEPLOY_PATH="/opt/textilelaunch"
SERVICE_NAME="textilelaunch"
DB_NAME="agency"
DB_USER="textilelaunch_db"
DB_PASSWORD="VotreMotDePasseSecurise123!"

echo "Checking database configuration..."

# Verify database user exists and has correct permissions
mysql -u root <<EOF
-- Verify user exists
SELECT User, Host FROM mysql.user WHERE User='${DB_USER}';

-- Grant privileges if needed
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF

# Verify .env file exists and has correct values
if [ ! -f "${DEPLOY_PATH}/.env" ]; then
    echo "Creating .env file..."
    SESSION_SECRET=$(openssl rand -hex 32)
    cat > ${DEPLOY_PATH}/.env <<EOF
NODE_ENV=production
PORT=5001
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
SESSION_SECRET=${SESSION_SECRET}
FRONTEND_URL=https://trendycosmetix.com
COOKIE_SECURE=true
COOKIE_SAMESITE=lax
EOF
    chown textilelaunch:textilelaunch ${DEPLOY_PATH}/.env
    chmod 600 ${DEPLOY_PATH}/.env
    echo "✅ Created .env file"
else
    echo "Updating .env file with correct database credentials..."
    # Update DB credentials in .env
    sed -i "s/^DB_USER=.*/DB_USER=${DB_USER}/" ${DEPLOY_PATH}/.env
    sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD}/" ${DEPLOY_PATH}/.env
    sed -i "s/^DB_NAME=.*/DB_NAME=${DB_NAME}/" ${DEPLOY_PATH}/.env
    sed -i "s/^DB_HOST=.*/DB_HOST=127.0.0.1/" ${DEPLOY_PATH}/.env
    sed -i "s/^DB_PORT=.*/DB_PORT=3306/" ${DEPLOY_PATH}/.env
    
    # Ensure production domain + secure cookies (always sync after DNS/SSL migration)
    sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=https://trendycosmetix.com|" ${DEPLOY_PATH}/.env
    sed -i "s|^COOKIE_SECURE=.*|COOKIE_SECURE=true|" ${DEPLOY_PATH}/.env
    sed -i "s|^COOKIE_SAMESITE=.*|COOKIE_SAMESITE=lax|" ${DEPLOY_PATH}/.env
    sed -i "s|^SCRAPER_API_URL=.*|SCRAPER_API_URL=https://trendycosmetix.com/api|" ${DEPLOY_PATH}/.env 2>/dev/null || \
      echo "SCRAPER_API_URL=https://trendycosmetix.com/api" >> ${DEPLOY_PATH}/.env
    sed -i "s/^NODE_ENV=.*/NODE_ENV=production/" ${DEPLOY_PATH}/.env 2>/dev/null || true

    # Reject accidental local dev DB user (common cause of login failures after deploy)
    if grep -q "^DB_USER=root" ${DEPLOY_PATH}/.env; then
        echo "⚠️  DB_USER was root (dev settings) — fixing to ${DB_USER}"
        sed -i "s/^DB_USER=.*/DB_USER=${DB_USER}/" ${DEPLOY_PATH}/.env
        sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD}/" ${DEPLOY_PATH}/.env
    fi
    
    echo "✅ Updated .env file"
fi

# Test database connection
echo "Testing database connection..."
mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 ${DB_NAME} -e "SELECT 1;" && echo "✅ Database connection successful" || echo "❌ Database connection failed"

# Run cost column migration if needed (idempotent: run add-cost-column.sql; ignore error if column exists)
if [ -f "${DEPLOY_PATH}/database/add-cost-column.sql" ]; then
  echo "Running product cost column migration (if needed)..."
  mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 ${DB_NAME} < "${DEPLOY_PATH}/database/add-cost-column.sql" 2>/dev/null && echo "✅ Cost column added" || echo "⚠️ Cost column may already exist (ok to ignore)"
fi

# Run API key plaintext column migration (so stored key can be used by scraper when field is empty)
if [ -f "${DEPLOY_PATH}/database/add-api-key-plaintext-column.sql" ]; then
  echo "Running API key plaintext column migration (if needed)..."
  mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 ${DB_NAME} < "${DEPLOY_PATH}/database/add-api-key-plaintext-column.sql" 2>/dev/null && echo "✅ API key plaintext column added" || echo "⚠️ API key plaintext column may already exist (ok to ignore)"
fi

# Run OpenRouter columns migration (if needed)
if [ -f "${DEPLOY_PATH}/database/add-openrouter-columns.sql" ]; then
  echo "Running OpenRouter columns migration (if needed)..."
  mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 ${DB_NAME} < "${DEPLOY_PATH}/database/add-openrouter-columns.sql" 2>/dev/null && echo "✅ OpenRouter columns added" || echo "⚠️ OpenRouter columns may already exist (ok to ignore)"
fi

# Restart service to pick up new .env
systemctl daemon-reload
systemctl restart ${SERVICE_NAME}

echo "✅ Service restarted. Check logs with: journalctl -u ${SERVICE_NAME} -f"
