#!/bin/bash
set -euo pipefail

# Comprehensive fix script for all authentication and database issues
# Run this on the server as root: sudo bash fix-all.sh

DEPLOY_PATH="/opt/textilelaunch"
SERVICE_NAME="textilelaunch"
APP_USER="textilelaunch"
DB_NAME="agency"
DB_USER="textilelaunch_db"
DB_PASSWORD="VotreMotDePasseSecurise123!"

echo "=== TextileLaunch Complete Fix Script ==="
echo ""

# Step 1: Fix database user and permissions
echo "1. Fixing database user and permissions..."
mysql -u root <<EOF
-- Create user if not exists
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';

-- Grant privileges
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;

-- Verify user exists
SELECT User, Host FROM mysql.user WHERE User='${DB_USER}';
EOF
echo "   ✅ Database user configured"
echo ""

# Step 2: Verify database exists and has schema
echo "2. Verifying database schema..."
if ! mysql -u root -e "USE ${DB_NAME}; SHOW TABLES LIKE 'sessions';" | grep -q sessions; then
    echo "   ⚠️  Sessions table missing, importing schema..."
    if [ -f "${DEPLOY_PATH}/database/schema.sql" ]; then
        mysql -u root ${DB_NAME} < ${DEPLOY_PATH}/database/schema.sql
        echo "   ✅ Schema imported"
    else
        echo "   ❌ Schema file not found at ${DEPLOY_PATH}/database/schema.sql"
    fi
else
    echo "   ✅ Sessions table exists"
fi
echo ""

# Step 3: Test database connection with correct credentials
echo "3. Testing database connection..."
if mysql -u ${DB_USER} -p${DB_PASSWORD} -h 127.0.0.1 ${DB_NAME} -e "SELECT 1;" &>/dev/null; then
    echo "   ✅ Database connection successful with ${DB_USER}"
else
    echo "   ❌ Database connection failed"
    exit 1
fi
echo ""

# Step 4: Update .env file with correct database credentials
echo "4. Updating .env file..."
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

chown ${APP_USER}:${APP_USER} ${DEPLOY_PATH}/.env
chmod 600 ${DEPLOY_PATH}/.env
echo "   ✅ .env file updated with correct credentials"
echo "   Current DB_USER: ${DB_USER}"
echo "   Current DB_NAME: ${DB_NAME}"
echo ""

# Step 5: Verify .env file contents
echo "5. Verifying .env file..."
echo "   DB_USER=$(grep ^DB_USER= ${DEPLOY_PATH}/.env | cut -d= -f2)"
echo "   DB_NAME=$(grep ^DB_NAME= ${DEPLOY_PATH}/.env | cut -d= -f2)"
echo "   COOKIE_SECURE=$(grep ^COOKIE_SECURE= ${DEPLOY_PATH}/.env | cut -d= -f2)"
echo "   COOKIE_SAMESITE=$(grep ^COOKIE_SAMESITE= ${DEPLOY_PATH}/.env | cut -d= -f2)"
echo ""

# Step 6: Restart service
echo "6. Restarting service..."
systemctl daemon-reload
systemctl restart ${SERVICE_NAME}
sleep 3

if systemctl is-active --quiet ${SERVICE_NAME}; then
    echo "   ✅ Service restarted successfully"
else
    echo "   ❌ Service failed to start"
    echo "   Check logs: journalctl -u ${SERVICE_NAME} -n 50"
    exit 1
fi
echo ""

# Step 7: Check service logs for database connection
echo "7. Checking service logs for database connection..."
sleep 2
if journalctl -u ${SERVICE_NAME} -n 20 --no-pager | grep -q "Database connected successfully"; then
    echo "   ✅ Database connection confirmed in logs"
else
    echo "   ⚠️  Database connection message not found in logs"
    echo "   Recent logs:"
    journalctl -u ${SERVICE_NAME} -n 10 --no-pager | tail -5
fi
echo ""

# Step 8: Check cookie configuration in logs
echo "8. Checking cookie configuration in logs..."
if journalctl -u ${SERVICE_NAME} -n 20 --no-pager | grep -q "Cookie configuration"; then
    echo "   ✅ Cookie configuration found in logs"
    journalctl -u ${SERVICE_NAME} -n 20 --no-pager | grep "Cookie configuration" | tail -1
else
    echo "   ⚠️  Cookie configuration not found (code may need update)"
fi
echo ""

echo "=== Fix Complete ==="
echo ""
echo "Next steps:"
echo "1. Check service logs: journalctl -u ${SERVICE_NAME} -f"
echo "2. Look for:"
echo "   - 'Database connected successfully'"
echo "   - 'Cookie configuration: { secure: true, sameSite: 'lax' }'"
echo "3. Test login at https://trendycosmetix.com"
echo "4. Check browser DevTools > Application > Cookies for 'sessionId' cookie"
echo ""
echo "If issues persist, check:"
echo "  - Database connection: mysql -u ${DB_USER} -p'${DB_PASSWORD}' -h 127.0.0.1 ${DB_NAME} -e 'SELECT 1;'"
echo "  - Service status: systemctl status ${SERVICE_NAME}"
echo "  - Recent errors: journalctl -u ${SERVICE_NAME} -n 50 --no-pager | grep -i error"
echo ""
